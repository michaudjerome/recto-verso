<?php
// Recto Verso : installation unique. Écrit la configuration hors du dossier web, crée les tables et le compte administrateur.
// Se verrouille dès que la configuration existe : la page renvoie alors une erreur 404.

declare(strict_types=1);
require __DIR__ . '/lib.php';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");

if (is_file(rv_config_path())) { http_response_code(404); exit('Not found'); }

$err = '';
$done = false;
$f = ['db_host' => '', 'db_name' => '', 'db_user' => '', 'email' => '', 'name' => ''];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    foreach ($f as $k => $_) $f[$k] = trim((string) ($_POST[$k] ?? ''));
    $dbPass = (string) ($_POST['db_pass'] ?? '');
    $pass = (string) ($_POST['password'] ?? '');
    $dev = getenv('RV_DEV') === '1';
    if (!$dev && !preg_match('/^[a-z0-9.\-]+\.mysql\.db$/i', $f['db_host'])) $err = 'Le serveur doit être une adresse OVH en .mysql.db (voir l\'onglet Bases de données).';
    elseif (!filter_var($f['email'], FILTER_VALIDATE_EMAIL)) $err = 'Adresse e-mail invalide.';
    elseif (strlen($pass) < 10) $err = 'Mot de passe administrateur : 10 caractères au moins.';
    elseif ($pass !== (string) ($_POST['password2'] ?? '')) $err = 'Les deux mots de passe administrateur ne sont pas identiques.';
    else {
        try {
            $pdo = new PDO("mysql:host={$f['db_host']};dbname={$f['db_name']};charset=utf8mb4", $f['db_user'], $dbPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            rv_schema($pdo);
            $cfg = [
                'db_host' => $f['db_host'], 'db_name' => $f['db_name'], 'db_user' => $f['db_user'], 'db_pass' => $dbPass,
                'mail_from' => 'noreply@jeromemichaud.fr',
                'base_url' => rv_base_url(),
            ];
            $php = "<?php\n// Recto Verso : configuration écrite par api/setup.php le " . date('Y-m-d H:i') . ". Ne jamais publier ce fichier.\nreturn " . var_export($cfg, true) . ";\n";
            if (@file_put_contents(rv_config_path(), $php, LOCK_EX) === false) throw new RuntimeException('Impossible d\'écrire la configuration dans ' . dirname(rv_config_path()));
            @chmod(rv_config_path(), 0600);
            $email = strtolower($f['email']);
            $pdo->prepare('INSERT INTO users (email, pass_hash, name, is_admin, created) VALUES (?, ?, ?, 1, ?) ON DUPLICATE KEY UPDATE pass_hash = VALUES(pass_hash), is_admin = 1')
                ->execute([$email, rv_pass_hash($pass), mb_substr($f['name'], 0, 30), rv_now()]);
            $done = true;
        } catch (Throwable $e) {
            $err = 'Échec : ' . $e->getMessage();
        }
    }
}
$h = function ($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); };
?><!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Recto Verso · installation</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;max-width:460px;margin:40px auto;padding:0 20px;color:#2b2622;background:#f7f2ea}
h1{font-size:22px}label{display:block;margin:14px 0 4px;font-weight:600;font-size:14px}
input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cfc5b8;border-radius:10px;font-size:16px;background:#fff}
button{margin-top:22px;width:100%;padding:12px;border:0;border-radius:12px;background:#c0392b;color:#fff;font-size:16px;font-weight:600}
.err{background:#fde8e6;border-radius:10px;padding:10px 12px;color:#8e1f15}.ok{background:#e7f3e8;border-radius:10px;padding:14px}
small{color:#7a6f63}fieldset{border:0;padding:0;margin:20px 0 0}legend{font-weight:700;margin-bottom:-6px}
</style></head><body>
<h1>Recto Verso · installation</h1>
<?php if ($done): ?>
<p class="ok">Installation terminée. La configuration est enregistrée hors du site et cette page est désormais verrouillée.<br><br>
<a href="../#/compte">Ouvrir Recto Verso et se connecter</a></p>
<?php else: ?>
<p><small>Page à usage unique. Elle se verrouille d'elle-même une fois l'installation faite.</small></p>
<?php if ($err): ?><p class="err"><?= $h($err) ?></p><?php endif; ?>
<form method="post" autocomplete="off">
<fieldset><legend>Base de données OVH</legend>
<label for="db_host">Serveur</label><input id="db_host" name="db_host" value="<?= $h($f['db_host']) ?>" placeholder="xxxxxx.mysql.db" required>
<label for="db_name">Nom de la base</label><input id="db_name" name="db_name" value="<?= $h($f['db_name']) ?>" required>
<label for="db_user">Utilisateur</label><input id="db_user" name="db_user" value="<?= $h($f['db_user']) ?>" required>
<label for="db_pass">Mot de passe de la base</label><input id="db_pass" name="db_pass" type="password" required>
</fieldset>
<fieldset><legend>Ton compte administrateur</legend>
<label for="name">Prénom</label><input id="name" name="name" value="<?= $h($f['name']) ?>" maxlength="30">
<label for="email">E-mail</label><input id="email" name="email" type="email" value="<?= $h($f['email']) ?>" required>
<label for="password">Mot de passe (10 caractères au moins)</label><input id="password" name="password" type="password" minlength="10" required autocomplete="new-password">
<label for="password2">Encore une fois</label><input id="password2" name="password2" type="password" minlength="10" required autocomplete="new-password">
</fieldset>
<button>Installer</button>
</form>
<?php endif; ?>
</body></html>
