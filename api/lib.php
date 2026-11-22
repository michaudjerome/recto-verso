<?php
// Recto Verso : socle commun de l'API (configuration, base, sessions, réponses).
// Compatible PHP 7.3 et plus. Aucun identifiant ici : ils sont dans un fichier hors du dossier web.

declare(strict_types=1);

const RV_COOKIE = 'rv_s';
const RV_SESSION_DAYS = 365;
const RV_MAX_RECORD = 2000000;   // 2 Mo par enregistrement (photo comprise)
const RV_PULL_LIMIT = 400;
// Horodatages en millisecondes : en dessous, la valeur vient du PHP 32 bits d'avant le 22/11/2026 et ne vaut rien
const RV_MS_MIN = 1000000000000;

function rv_config_path(): string
{
    $env = getenv('RV_CONFIG');
    if ($env) return $env;
    // /home/<compte>/recto-verso/api/lib.php  ->  /home/<compte>/.recto-verso-config.php
    return dirname(__DIR__, 2) . '/.recto-verso-config.php';
}

function rv_config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $p = rv_config_path();
        $cfg = is_file($p) ? (require $p) : [];
    }
    return $cfg;
}

function rv_db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = rv_config();
    if (!$c) rv_fail(503, 'not_configured');
    $pdo = new PDO(
        "mysql:host={$c['db_host']};port=" . ($c['db_port'] ?? 3306) . ";dbname={$c['db_name']};charset=utf8mb4",
        $c['db_user'],
        $c['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]
    );
    return $pdo;
}

function rv_schema(PDO $db): void
{
    $sql = [
        "CREATE TABLE IF NOT EXISTS users (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(190) NOT NULL UNIQUE,
            pass_hash VARCHAR(255) NOT NULL,
            name VARCHAR(60) NOT NULL DEFAULT '',
            is_admin TINYINT(1) NOT NULL DEFAULT 0,
            rev BIGINT UNSIGNED NOT NULL DEFAULT 0,
            created BIGINT NOT NULL,
            last_seen BIGINT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS sessions (
            token_hash CHAR(64) PRIMARY KEY,
            user_id INT UNSIGNED NOT NULL,
            created BIGINT NOT NULL,
            last_seen BIGINT NOT NULL,
            expires BIGINT NOT NULL,
            agent VARCHAR(190) NOT NULL DEFAULT '',
            KEY by_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS invites (
            code CHAR(16) PRIMARY KEY,
            created_by INT UNSIGNED NOT NULL,
            note VARCHAR(60) NOT NULL DEFAULT '',
            created BIGINT NOT NULL,
            expires BIGINT NOT NULL,
            used_by INT UNSIGNED NULL,
            used_at BIGINT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS resets (
            token_hash CHAR(64) PRIMARY KEY,
            user_id INT UNSIGNED NOT NULL,
            expires BIGINT NOT NULL,
            used TINYINT(1) NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS attempts (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            kind VARCHAR(16) NOT NULL,
            ip VARCHAR(64) NOT NULL,
            email VARCHAR(190) NOT NULL DEFAULT '',
            ts BIGINT NOT NULL,
            KEY by_ip (kind, ip, ts),
            KEY by_email (kind, email, ts)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS records (
            user_id INT UNSIGNED NOT NULL,
            store VARCHAR(12) NOT NULL,
            rid VARCHAR(160) NOT NULL,
            data MEDIUMTEXT NULL,
            u BIGINT NOT NULL,
            deleted TINYINT(1) NOT NULL DEFAULT 0,
            rev BIGINT UNSIGNED NOT NULL,
            PRIMARY KEY (user_id, store, rid),
            KEY by_rev (user_id, rev)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin",
    ];
    foreach ($sql as $q) $db->exec($q);
}

// ---------- Réponses ----------

function rv_json($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function rv_fail(int $code, string $error, array $extra = []): void
{
    rv_json(['error' => $error] + $extra, $code);
}

function rv_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 12000000) rv_fail(413, 'too_large');
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

function rv_now(): int
{
    // Les horodatages en millisecondes exigent un PHP 64 bits (en 32 bits ils débordent et la synchronisation se dérègle)
    if (PHP_INT_SIZE < 8) rv_fail(500, 'php32');
    return (int) round(microtime(true) * 1000);
}

function rv_ip(): string { return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64); }

function rv_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
}

function rv_base_url(): string
{
    $c = rv_config();
    if (!empty($c['base_url'])) return rtrim($c['base_url'], '/') . '/';
    $host = preg_replace('/[^a-z0-9.\-:]/i', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    return (rv_https() ? 'https' : 'http') . '://' . $host . '/';
}

// ---------- Limitation des tentatives ----------

function rv_too_many(string $kind, string $email, int $maxIp, int $maxEmail, int $windowMin = 15): bool
{
    $db = rv_db();
    $since = rv_now() - $windowMin * 60000;
    $db->prepare('DELETE FROM attempts WHERE ts < ?')->execute([rv_now() - 86400000]);
    $q = $db->prepare('SELECT COUNT(*) FROM attempts WHERE kind = ? AND ip = ? AND ts > ?');
    $q->execute([$kind, rv_ip(), $since]);
    if ((int) $q->fetchColumn() >= $maxIp) return true;
    if ($email !== '') {
        $q = $db->prepare('SELECT COUNT(*) FROM attempts WHERE kind = ? AND email = ? AND ts > ?');
        $q->execute([$kind, $email, $since]);
        if ((int) $q->fetchColumn() >= $maxEmail) return true;
    }
    return false;
}

function rv_attempt(string $kind, string $email = ''): void
{
    rv_db()->prepare('INSERT INTO attempts (kind, ip, email, ts) VALUES (?, ?, ?, ?)')->execute([$kind, rv_ip(), $email, rv_now()]);
}

// ---------- Sessions ----------

function rv_token(int $bytes = 32): string { return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '='); }

function rv_hash(string $token): string { return hash('sha256', $token); }

function rv_set_cookie(string $value, int $maxAge): void
{
    setcookie(RV_COOKIE, $value, [
        'expires' => $maxAge > 0 ? time() + $maxAge : time() - 3600,
        'path' => '/api/',
        'secure' => rv_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function rv_open_session(int $userId): void
{
    $t = rv_token();
    $now = rv_now();
    rv_db()->prepare('INSERT INTO sessions (token_hash, user_id, created, last_seen, expires, agent) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([rv_hash($t), $userId, $now, $now, $now + RV_SESSION_DAYS * 86400000, substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 190)]);
    rv_set_cookie($t, RV_SESSION_DAYS * 86400);
}

function rv_close_session(): void
{
    $t = $_COOKIE[RV_COOKIE] ?? '';
    if ($t) rv_db()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([rv_hash($t)]);
    rv_set_cookie('', 0);
}

// Renvoie l'utilisateur connecté, ou null. La session se prolonge à l'usage (une fois par jour au plus).
function rv_user(): ?array
{
    $t = $_COOKIE[RV_COOKIE] ?? '';
    if (!is_string($t) || strlen($t) < 20 || strlen($t) > 100) return null;
    $db = rv_db();
    $q = $db->prepare('SELECT s.token_hash, s.last_seen, s.expires, u.id, u.email, u.name, u.is_admin FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?');
    $q->execute([rv_hash($t)]);
    $r = $q->fetch();
    $now = rv_now();
    if (!$r) return null;
    $broken = (int) $r['expires'] < RV_MS_MIN; // session ouverte sous PHP 32 bits : on la répare au lieu de la fermer
    if (!$broken && (int) $r['expires'] < $now) return null;
    if ($broken || $now - (int) $r['last_seen'] > 86400000) {
        $db->prepare('UPDATE sessions SET last_seen = ?, expires = ? WHERE token_hash = ?')->execute([$now, $now + RV_SESSION_DAYS * 86400000, $r['token_hash']]);
        $db->prepare('UPDATE users SET last_seen = ? WHERE id = ?')->execute([$now, $r['id']]);
        rv_set_cookie($t, RV_SESSION_DAYS * 86400);
    }
    return ['id' => (int) $r['id'], 'email' => $r['email'], 'name' => $r['name'], 'admin' => (bool) $r['is_admin']];
}

function rv_require_user(): array
{
    $u = rv_user();
    if (!$u) rv_fail(401, 'auth');
    return $u;
}

function rv_public_user(array $u): array
{
    return ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name'], 'admin' => (bool) $u['admin']];
}

// ---------- Validation ----------

function rv_email($v): string
{
    $e = strtolower(trim((string) $v));
    if (strlen($e) > 190 || !filter_var($e, FILTER_VALIDATE_EMAIL)) rv_fail(400, 'email');
    return $e;
}

function rv_password($v): string
{
    $p = (string) $v;
    if (strlen($p) < 8) rv_fail(400, 'password_short');
    if (strlen($p) > 200) rv_fail(400, 'password_long');
    return $p;
}

function rv_pass_hash(string $p): string
{
    return defined('PASSWORD_ARGON2ID') ? password_hash($p, PASSWORD_ARGON2ID) : password_hash($p, PASSWORD_DEFAULT);
}

// ---------- E-mails ----------

function rv_mail(string $to, string $subject, string $body): bool
{
    $c = rv_config();
    $from = $c['mail_from'] ?? 'noreply@jeromemichaud.fr';
    $log = getenv('RV_MAIL_LOG');
    if ($log) { file_put_contents($log, "To: $to\nSubject: $subject\n\n$body\n----\n", FILE_APPEND); return true; }
    $headers = implode("\r\n", [
        'From: Recto Verso <' . $from . '>',
        'Reply-To: ' . $from,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers, '-f' . $from);
}
