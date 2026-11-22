<?php
// Recto Verso : API des comptes et de la synchronisation.
// Appel : POST api/index.php?r=<action>, corps JSON, en-tête X-RV: 1 (protège des requêtes forgées).

declare(strict_types=1);
require __DIR__ . '/lib.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

$r = preg_replace('/[^a-z_\/]/', '', (string) ($_GET['r'] ?? ''));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($r === 'health') rv_json(['ok' => true, 'configured' => (bool) rv_config(), 'php' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION, 'bits' => PHP_INT_SIZE * 8]);

// Les actions d'écriture exigent l'en-tête maison et une origine identique
if ($method === 'POST') {
    if (($_SERVER['HTTP_X_RV'] ?? '') !== '1') rv_fail(403, 'header');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && rtrim($origin, '/') . '/' !== rv_base_url()) rv_fail(403, 'origin');
} elseif ($r !== 'me') {
    rv_fail(405, 'method');
}

try {
    rv_repair_32bit();
    switch ($r) {
        case 'me': me(); break;
        case 'login': login(); break;
        case 'signup': signup(); break;
        case 'logout': rv_close_session(); rv_json(['ok' => true]);
        case 'forgot': forgot(); break;
        case 'reset': reset_password(); break;
        case 'password': change_password(); break;
        case 'delete': delete_account(); break;
        case 'invite_check': invite_check(); break;
        case 'invites': invites(); break;
        case 'invite_new': invite_new(); break;
        case 'invite_drop': invite_drop(); break;
        case 'sync': sync(); break;
        default: rv_fail(404, 'unknown');
    }
} catch (PDOException $e) {
    error_log('recto-verso: ' . $e->getMessage());
    rv_fail(500, 'server');
}

// ---------- Compte ----------

function me(): void
{
    $u = rv_require_user();
    rv_json(['user' => rv_public_user($u)]);
}

function login(): void
{
    $in = rv_input();
    $email = rv_email($in['email'] ?? '');
    if (rv_too_many('login', $email, 20, 8)) rv_fail(429, 'slow_down');
    $q = rv_db()->prepare('SELECT id, email, name, is_admin, pass_hash FROM users WHERE email = ?');
    $q->execute([$email]);
    $u = $q->fetch();
    $pass = (string) ($in['password'] ?? '');
    // Vérification même si le compte n'existe pas : même durée de réponse
    $ok = password_verify($pass, $u ? $u['pass_hash'] : '$2y$10$abcdefghijklmnopqrstuuJ2o1R3k1JX5c2qkzvR9oZ7rG7cE8bW.');
    if (!$u || !$ok) { rv_attempt('login', $email); rv_fail(401, 'bad_login'); }
    if (password_needs_rehash($u['pass_hash'], defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT)) {
        rv_db()->prepare('UPDATE users SET pass_hash = ? WHERE id = ?')->execute([rv_pass_hash($pass), $u['id']]);
    }
    rv_open_session((int) $u['id']);
    rv_json(['user' => ['id' => (int) $u['id'], 'email' => $u['email'], 'name' => $u['name'], 'admin' => (bool) $u['is_admin']]]);
}

function invite_row(string $code): ?array
{
    $q = rv_db()->prepare('SELECT * FROM invites WHERE code = ?');
    $q->execute([$code]);
    $i = $q->fetch();
    if (!$i || $i['used_by'] !== null || ((int) $i['expires'] >= RV_MS_MIN && (int) $i['expires'] < rv_now())) return null;
    return $i;
}

function clean_code($v): string { return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $v)); }

function invite_check(): void
{
    if (rv_too_many('invite', '', 30, 0)) rv_fail(429, 'slow_down');
    $i = invite_row(clean_code(rv_input()['code'] ?? ''));
    if (!$i) { rv_attempt('invite'); rv_fail(404, 'invite'); }
    rv_json(['ok' => true, 'note' => $i['note']]);
}

function signup(): void
{
    $in = rv_input();
    if (rv_too_many('signup', '', 10, 0)) rv_fail(429, 'slow_down');
    $code = clean_code($in['invite'] ?? '');
    $email = rv_email($in['email'] ?? '');
    $pass = rv_password($in['password'] ?? '');
    $name = mb_substr(trim((string) ($in['name'] ?? '')), 0, 30);
    $db = rv_db();
    $db->beginTransaction();
    $q = $db->prepare('SELECT * FROM invites WHERE code = ? FOR UPDATE');
    $q->execute([$code]);
    $i = $q->fetch();
    if (!$i || $i['used_by'] !== null || ((int) $i['expires'] >= RV_MS_MIN && (int) $i['expires'] < rv_now())) { $db->rollBack(); rv_attempt('signup'); rv_fail(404, 'invite'); }
    $q = $db->prepare('SELECT id FROM users WHERE email = ?');
    $q->execute([$email]);
    if ($q->fetch()) { $db->rollBack(); rv_fail(409, 'email_taken'); }
    $db->prepare('INSERT INTO users (email, pass_hash, name, created) VALUES (?, ?, ?, ?)')->execute([$email, rv_pass_hash($pass), $name, rv_now()]);
    $id = (int) $db->lastInsertId();
    $db->prepare('UPDATE invites SET used_by = ?, used_at = ? WHERE code = ?')->execute([$id, rv_now(), $code]);
    $db->commit();
    rv_open_session($id);
    rv_json(['user' => ['id' => $id, 'email' => $email, 'name' => $name, 'admin' => false]]);
}

function forgot(): void
{
    $in = rv_input();
    $email = rv_email($in['email'] ?? '');
    $lang = substr(preg_replace('/[^a-z]/', '', (string) ($in['lang'] ?? 'fr')), 0, 2);
    // Réponse identique que le compte existe ou non : on ne révèle pas qui est inscrit
    if (rv_too_many('forgot', $email, 10, 3, 60)) rv_json(['ok' => true]);
    rv_attempt('forgot', $email);
    $q = rv_db()->prepare('SELECT id, name FROM users WHERE email = ?');
    $q->execute([$email]);
    $u = $q->fetch();
    if ($u) {
        $t = rv_token(24);
        rv_db()->prepare('INSERT INTO resets (token_hash, user_id, expires) VALUES (?, ?, ?)')->execute([rv_hash($t), $u['id'], rv_now() + 3600000]);
        $link = rv_base_url() . '#/compte?reset=' . $t;
        [$subject, $body] = reset_mail($lang, (string) $u['name'], $link);
        rv_mail($email, $subject, $body);
    }
    rv_json(['ok' => true]);
}

function reset_mail(string $lang, string $name, string $link): array
{
    $m = [
        'fr' => ['Recto Verso : nouveau mot de passe', "Bonjour{n},\n\nPour choisir un nouveau mot de passe Recto Verso, ouvre ce lien (valable une heure) :\n\n{l}\n\nSi tu n'as rien demandé, ignore ce message : ton mot de passe ne change pas.\n\nRecto Verso"],
        'en' => ['Recto Verso: new password', "Hello{n},\n\nTo choose a new Recto Verso password, open this link (valid for one hour):\n\n{l}\n\nIf you didn't ask for this, just ignore this message: your password stays the same.\n\nRecto Verso"],
        'es' => ['Recto Verso: nueva contraseña', "Hola{n}:\n\nPara elegir una nueva contraseña de Recto Verso, abre este enlace (válido una hora):\n\n{l}\n\nSi no lo has pedido, ignora este mensaje: tu contraseña no cambia.\n\nRecto Verso"],
        'it' => ['Recto Verso: nuova password', "Ciao{n},\n\nPer scegliere una nuova password di Recto Verso, apri questo link (valido un'ora):\n\n{l}\n\nSe non hai chiesto nulla, ignora questo messaggio: la tua password non cambia.\n\nRecto Verso"],
        'de' => ['Recto Verso: neues Passwort', "Hallo{n},\n\num ein neues Passwort für Recto Verso zu wählen, öffne diesen Link (eine Stunde gültig):\n\n{l}\n\nWenn du nichts angefordert hast, ignoriere diese Nachricht: Dein Passwort bleibt gleich.\n\nRecto Verso"],
        'zh' => ['Recto Verso：设置新密码', "你好{n}，\n\n请打开以下链接设置新的 Recto Verso 密码（一小时内有效）：\n\n{l}\n\n如果这不是你的操作，请忽略此邮件，你的密码不会改变。\n\nRecto Verso"],
    ];
    [$s, $b] = $m[$lang] ?? $m['en'];
    $n = $name !== '' ? ($lang === 'zh' ? $name : ' ' . $name) : '';
    return [$s, str_replace(['{n}', '{l}'], [$n, $link], $b)];
}

function reset_password(): void
{
    $in = rv_input();
    if (rv_too_many('reset', '', 20, 0)) rv_fail(429, 'slow_down');
    $t = (string) ($in['token'] ?? '');
    $pass = rv_password($in['password'] ?? '');
    $db = rv_db();
    $q = $db->prepare('SELECT user_id FROM resets WHERE token_hash = ? AND used = 0 AND expires > ?');
    $q->execute([rv_hash($t), rv_now()]);
    $uid = $q->fetchColumn();
    if (!$uid) { rv_attempt('reset'); rv_fail(404, 'reset'); }
    $db->prepare('UPDATE resets SET used = 1 WHERE token_hash = ?')->execute([rv_hash($t)]);
    $db->prepare('UPDATE users SET pass_hash = ? WHERE id = ?')->execute([rv_pass_hash($pass), $uid]);
    // Toutes les anciennes sessions sont fermées : seul l'appareil qui réinitialise reste connecté
    $db->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$uid]);
    rv_open_session((int) $uid);
    $q = $db->prepare('SELECT id, email, name, is_admin FROM users WHERE id = ?');
    $q->execute([$uid]);
    $u = $q->fetch();
    rv_json(['user' => ['id' => (int) $u['id'], 'email' => $u['email'], 'name' => $u['name'], 'admin' => (bool) $u['is_admin']]]);
}

function check_password(array $u, string $pass): void
{
    if (rv_too_many('login', $u['email'], 20, 8)) rv_fail(429, 'slow_down');
    $q = rv_db()->prepare('SELECT pass_hash FROM users WHERE id = ?');
    $q->execute([$u['id']]);
    if (!password_verify($pass, (string) $q->fetchColumn())) { rv_attempt('login', $u['email']); rv_fail(401, 'bad_password'); }
}

function change_password(): void
{
    $u = rv_require_user();
    $in = rv_input();
    check_password($u, (string) ($in['old'] ?? ''));
    $new = rv_password($in['new'] ?? '');
    $db = rv_db();
    $db->prepare('UPDATE users SET pass_hash = ? WHERE id = ?')->execute([rv_pass_hash($new), $u['id']]);
    $db->prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?')->execute([$u['id'], rv_hash($_COOKIE[RV_COOKIE] ?? '')]);
    rv_json(['ok' => true]);
}

function delete_account(): void
{
    $u = rv_require_user();
    check_password($u, (string) (rv_input()['password'] ?? ''));
    $db = rv_db();
    foreach (['records', 'sessions', 'resets'] as $t) $db->prepare("DELETE FROM $t WHERE user_id = ?")->execute([$u['id']]);
    $db->prepare('DELETE FROM invites WHERE created_by = ? AND used_by IS NULL')->execute([$u['id']]);
    $db->prepare('DELETE FROM users WHERE id = ?')->execute([$u['id']]);
    rv_set_cookie('', 0);
    rv_json(['ok' => true]);
}

// ---------- Invitations (administrateur) ----------

function rv_require_admin(): array
{
    $u = rv_require_user();
    if (!$u['admin']) rv_fail(403, 'admin');
    return $u;
}

function invites(): void
{
    rv_require_admin();
    $rows = rv_db()->query('SELECT i.code, i.note, i.created, i.expires, i.used_at, u.email AS used_email FROM invites i LEFT JOIN users u ON u.id = i.used_by ORDER BY i.created DESC LIMIT 100')->fetchAll();
    $users = rv_db()->query('SELECT email, name, created, last_seen FROM users ORDER BY created')->fetchAll();
    rv_json(['invites' => $rows, 'users' => $users, 'base' => rv_base_url()]);
}

function invite_new(): void
{
    $u = rv_require_admin();
    $note = mb_substr(trim((string) (rv_input()['note'] ?? '')), 0, 60);
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($k = 0; $k < 12; $k++) $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    rv_db()->prepare('INSERT INTO invites (code, created_by, note, created, expires) VALUES (?, ?, ?, ?, ?)')
        ->execute([$code, $u['id'], $note, rv_now(), rv_now() + 30 * 86400000]);
    rv_json(['code' => $code, 'url' => rv_base_url() . '#/compte?invite=' . $code]);
}

function invite_drop(): void
{
    rv_require_admin();
    rv_db()->prepare('DELETE FROM invites WHERE code = ? AND used_by IS NULL')->execute([clean_code(rv_input()['code'] ?? '')]);
    rv_json(['ok' => true]);
}

// ---------- Synchronisation ----------
// Le client envoie ce qui a changé chez lui, puis reçoit ce qui a changé ailleurs depuis son dernier passage.
// Règle : pour chaque enregistrement, la version la plus récente (u, en millisecondes) l'emporte.

function sync(): void
{
    $u = rv_require_user();
    $in = rv_input();
    $since = max(0, (int) ($in['since'] ?? 0));
    $changes = is_array($in['changes'] ?? null) ? $in['changes'] : [];
    if (count($changes) > 500) rv_fail(413, 'too_many');
    $stores = ['kv' => 1, 'courses' => 1, 'cards' => 1, 'decks' => 1, 'logs' => 1, 'photos' => 1];
    $db = rv_db();
    $written = [];
    $accepted = 0;

    if ($changes) {
        $db->beginTransaction();
        $sel = $db->prepare('SELECT u FROM records WHERE user_id = ? AND store = ? AND rid = ? FOR UPDATE');
        $ins = $db->prepare('INSERT INTO records (user_id, store, rid, data, u, deleted, rev) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE data = VALUES(data), u = VALUES(u), deleted = VALUES(deleted), rev = VALUES(rev)');
        $bump = $db->prepare('UPDATE users SET rev = LAST_INSERT_ID(rev + 1) WHERE id = ?');
        foreach ($changes as $c) {
            $s = (string) ($c['s'] ?? '');
            $rid = (string) ($c['k'] ?? '');
            $ts = (int) ($c['u'] ?? 0);
            $del = !empty($c['x']);
            if (!isset($stores[$s]) || $rid === '' || strlen($rid) > 160 || $ts < RV_MS_MIN) continue;
            $data = $del ? null : json_encode($c['d'] ?? null, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($data !== null && strlen($data) > RV_MAX_RECORD) continue;
            $sel->execute([$u['id'], $s, $rid]);
            $cur = $sel->fetchColumn();
            if ($cur !== false && (int) $cur >= RV_MS_MIN && (int) $cur >= $ts) continue;
            $bump->execute([$u['id']]);
            $rev = (int) $db->lastInsertId();
            $ins->execute([$u['id'], $s, $rid, $data, $ts, $del ? 1 : 0, $rev]);
            $written[$rev] = true;
            $accepted++;
        }
        $db->commit();
    }

    $q = $db->prepare('SELECT store, rid, data, u, deleted, rev FROM records WHERE user_id = ? AND rev > ? ORDER BY rev LIMIT ' . (RV_PULL_LIMIT + 1));
    $q->execute([$u['id'], $since]);
    $rows = $q->fetchAll();
    $more = count($rows) > RV_PULL_LIMIT;
    if ($more) array_pop($rows);
    $out = [];
    $cursor = $since;
    foreach ($rows as $row) {
        $cursor = (int) $row['rev'];
        if (isset($written[$cursor])) continue; // déjà sur l'appareil qui vient de l'envoyer
        $out[] = ['s' => $row['store'], 'k' => $row['rid'], 'u' => (int) $row['u'], 'x' => (int) $row['deleted'] === 1, 'd' => $row['deleted'] ? null : json_decode((string) $row['data'], true)];
    }
    if (!$more && $written) $cursor = max($cursor, max(array_keys($written)));
    rv_json(['rev' => $cursor, 'more' => $more, 'changes' => $out, 'accepted' => $accepted, 'user' => rv_public_user($u)]);
}

// Réparation des dates écrites par le PHP 32 bits (avant le 22/11/2026) : horodatages débordés, donc faux
function rv_repair_32bit(): void
{
    if (!rv_config()) return;
    $db = rv_db();
    $now = rv_now();
    $db->prepare('UPDATE invites SET expires = ? WHERE expires < ? AND used_by IS NULL')->execute([$now + 30 * 86400000, RV_MS_MIN]);
    $db->prepare('UPDATE sessions SET expires = ?, last_seen = ? WHERE expires < ?')->execute([$now + RV_SESSION_DAYS * 86400000, $now, RV_MS_MIN]);
    $db->prepare('UPDATE resets SET used = 1 WHERE expires < ?')->execute([RV_MS_MIN]);
    $db->prepare('UPDATE users SET created = ? WHERE created < ?')->execute([$now, RV_MS_MIN]);
    $db->prepare('DELETE FROM attempts WHERE ts < ?')->execute([RV_MS_MIN]);
}
