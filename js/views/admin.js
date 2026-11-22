// Admin : réservé à l'administrateur (compte créé à l'installation). Textes en français : un seul lecteur.
// Membres et activité, invitations, signalements, mots de chaque langue (corrections appliquées chez tous),
// annonce, statistiques d'usage et état du serveur.
import { api } from '../api.js';
import { currentAccount } from '../sync.js';
import { notions, entry, setEdits } from '../content.js';
import { LANGS, flag } from '../langs.js';
import { visual } from '../face.js';
import { esc, icon, toast, sheet, closeSheet, later } from '../ui.js';

const TABS = [['membres', 'Membres'], ['invitations', 'Invitations'], ['signalements', 'Signalements'], ['mots', 'Mots'], ['annonce', 'Annonce'], ['serveur', 'Serveur']];
const KIND = { translation: 'Traduction fausse', picture: 'Image ambiguë', other: 'Autre' };
const date = (ms) => (ms ? new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short', year: 'numeric' }).format(+ms) : '—');
const ago = (ms) => {
  if (!ms) return 'jamais';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 2) return 'à l’instant';
  if (m < 60) return `il y a ${m} min`;
  if (m < 48 * 60) return `il y a ${Math.round(m / 60)} h`;
  return `il y a ${Math.round(m / 1440)} j`;
};
const errText = (code) => ({ offline: 'Pas de connexion.', admin: 'Réservé à l’administrateur.', self: 'Impossible sur ton propre compte.' }[code] || `Erreur (${code}).`);
let tab = 'membres';

export async function render(el, params = {}) {
  if (!currentAccount()?.admin) { location.hash = '#/reglages'; return; }
  if (params.t && TABS.some(([k]) => k === params.t)) tab = params.t;
  el.innerHTML = `<div class="page admin enter">
    <div class="top"><a class="icon-btn" href="#/reglages" aria-label="Retour">${icon('back')}</a><span class="ttl">Admin</span><span style="width:40px"></span></div>
    <div class="chips admin-tabs">${TABS.map(([k, n]) => `<button class="chip ${k === tab ? 'on' : ''}" data-t="${k}">${n}<small class="badge-n" data-n="${k}"></small></button>`).join('')}</div>
    <div class="admin-body"><p class="hint">Chargement…</p></div></div>`;
  el.querySelectorAll('.admin-tabs .chip').forEach((b) => b.onclick = () => { tab = b.dataset.t; render(el); });
  const body = el.querySelector('.admin-body');
  let ov;
  try { ov = await api('admin_overview', {}); } catch (e) { body.innerHTML = `<p class="hint">${esc(errText(e.code))}</p>`; return; }
  const badge = el.querySelector('[data-n="signalements"]');
  if (ov.reports_open) badge.textContent = ov.reports_open;
  const views = { membres, invitations, signalements, mots, annonce, serveur };
  await views[tab](body, ov, () => render(el));
}

// ---------- Membres ----------
function membres(body, ov, reload) {
  const active = ov.users.filter((u) => Date.now() - u.seen < 7 * 864e5).length;
  body.innerHTML = `<div class="kpis"><div><b>${ov.users.length}</b><small>membres</small></div><div><b>${active}</b><small>actifs (7 j)</small></div>
    <div><b>${ov.stats.active7}</b><small>ont révisé (7 j)</small></div></div>
    <div class="list">${ov.users.map((u) => `<button class="row member" data-id="${u.id}">
      <span class="grow"><b>${esc(u.name || u.email)}${u.is_admin ? ' · admin' : ''}</b><small>${esc(u.email)}</small>
      <small>${u.cards} cartes · ${u.logs} réponses · ${u.courses.map((c) => esc(c.split('>')[1] || c)).join(', ') || 'aucune langue'} · vu ${esc(ago(u.seen))}</small></span>${icon('chevron')}</button>`).join('')}</div>`;
  body.querySelectorAll('.member').forEach((b) => b.onclick = () => memberSheet(ov.users.find((u) => u.id === +b.dataset.id), reload));
}

function memberSheet(u, reload) {
  const sh = sheet(`<h2>${esc(u.name || u.email)}</h2>
    <p class="hint">${esc(u.email)}<br>Inscrit le ${esc(date(u.created))} · vu ${esc(ago(u.seen))}<br>
    ${u.cards} cartes · ${u.logs} réponses · ${u.photos} photos · ${u.devices} appareil${u.devices > 1 ? 's' : ''} connecté${u.devices > 1 ? 's' : ''}<br>
    Langues : ${esc(u.courses.join(', ') || 'aucune')}</p>
    <button class="btn ghost reset">Envoyer un lien de nouveau mot de passe</button>
    <div class="reset-out"></div>
    <button class="btn ghost logout">Déconnecter tous ses appareils</button>
    ${u.is_admin ? '' : '<button class="btn ghost del danger-t">Supprimer ce compte</button>'}`);
  sh.querySelector('.reset').onclick = async (e) => {
    e.currentTarget.disabled = true;
    try {
      const r = await api('admin_user', { id: u.id, action: 'reset' });
      sh.querySelector('.reset-out').innerHTML = `<p class="hint small">${r.sent ? 'E-mail envoyé.' : 'L’e-mail n’a pas pu partir.'} Lien valable 24 h, à transmettre toi-même si besoin :</p>
        <div class="inv-link"><code>${esc(r.link)}</code></div><button class="btn ghost cp">Copier le lien</button>`;
      sh.querySelector('.cp').onclick = () => navigator.clipboard?.writeText(r.link).then(() => toast('Lien copié ✨'));
    } catch (ex) { toast(errText(ex.code)); }
  };
  sh.querySelector('.logout').onclick = async () => { try { await api('admin_user', { id: u.id, action: 'logout' }); toast('Appareils déconnectés'); closeSheet(); reload(); } catch (ex) { toast(errText(ex.code)); } };
  const del = sh.querySelector('.del');
  if (del) del.onclick = async () => {
    if (!del.classList.contains('armed')) { del.classList.add('armed'); del.textContent = 'Touche encore : compte et cartes effacés pour de bon'; later(() => { if (del.isConnected) { del.classList.remove('armed'); del.textContent = 'Supprimer ce compte'; } }, 5000); return; }
    try { await api('admin_user', { id: u.id, action: 'delete' }); toast('Compte supprimé'); closeSheet(); reload(); } catch (ex) { toast(errText(ex.code)); }
  };
}

// ---------- Invitations ----------
function invitations(body, ov, reload) {
  const open = ov.invites.filter((i) => !i.used_at && +i.expires > Date.now());
  const used = ov.invites.filter((i) => i.used_at);
  const url = (code) => `${ov.base}#/compte?invite=${code}`;
  body.innerHTML = `<form class="acc-form inv-new" novalidate><label class="set-label" for="ivn">Pour qui ?</label>
      <input id="ivn" class="field" maxlength="60" placeholder="Un prénom, pour t’en souvenir"><button class="btn primary">Créer le lien</button></form>
    <div class="inv-out" hidden></div>
    <div class="set-label">En attente (${open.length})</div>
    <div class="list">${open.map((i) => `<div class="inv-row"><span><b>${esc(i.note || i.code)}</b><small>créée le ${esc(date(i.created))} · valable jusqu’au ${esc(date(i.expires))}</small></span>
      <button class="mini-btn share" data-u="${esc(url(i.code))}">Partager</button><button class="mini-btn rm" data-c="${esc(i.code)}">Révoquer</button></div>`).join('') || '<p class="hint small">Aucune.</p>'}</div>
    <div class="set-label">Utilisées (${used.length})</div>
    <div class="list">${used.map((i) => `<div class="inv-row"><span><b>${esc(i.note || i.code)}</b><small>${esc(i.used_name || i.used_email || 'compte supprimé')} · inscrit le ${esc(date(i.used_at))}</small></span></div>`).join('') || '<p class="hint small">Aucune.</p>'}</div>`;
  body.querySelector('.inv-new').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('invite_new', { note: body.querySelector('#ivn').value.trim() });
      const out = body.querySelector('.inv-out');
      out.hidden = false;
      out.innerHTML = `<div class="inv-link"><code>${esc(r.url)}</code></div><div class="duo"><button class="btn ghost cp">Copier</button><button class="btn accent sh">Partager</button></div>`;
      out.querySelector('.cp').onclick = () => navigator.clipboard?.writeText(r.url).then(() => toast('Lien copié ✨'));
      out.querySelector('.sh').onclick = () => share(r.url);
    } catch (ex) { toast(errText(ex.code)); }
  };
  body.querySelectorAll('.share').forEach((b) => b.onclick = () => share(b.dataset.u));
  body.querySelectorAll('.rm').forEach((b) => b.onclick = async () => {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Sûr ?'; return; }
    await api('invite_drop', { code: b.dataset.c }).catch(() => {}); reload();
  });
}
async function share(url) {
  const text = 'Je t’invite sur Recto Verso, pour apprendre des langues avec des cartes qui se retournent.';
  if (navigator.share) { try { await navigator.share({ title: 'Recto Verso', text, url }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast('Lien copié ✨'); } catch { prompt('', url); }
}

// ---------- Signalements ----------
async function signalements(body, ov, reload) {
  let done = false;
  const draw = async () => {
    const r = await api('reports', { done });
    const d = await notions();
    const fr = (id) => entry(id, 'fr');
    const rows = await Promise.all(r.reports.map(async (x) => ({ ...x, w: (await fr(x.notion))?.w || x.notion, n: d._byId.get(x.notion) })));
    body.innerHTML = `<div class="seg wide rep-seg"><button class="${done ? '' : 'on'}" data-d="0">À traiter</button><button class="${done ? 'on' : ''}" data-d="1">Traités</button></div>
      <div class="list">${rows.map((x) => `<div class="rep-row"><div class="rep-vis">${x.n ? visual({ notion: x.n }) : ''}</div>
        <span class="grow"><b>${esc(x.w)}</b> <small>(${esc(x.course)})</small><small>${esc(KIND[x.kind] || x.kind)} · ${esc(x.name || x.email || '?')} · ${esc(date(x.created))}</small>
        ${x.comment ? `<small class="rep-c">« ${esc(x.comment)} »</small>` : ''}</span>
        <span class="lot-acts">${x.notion ? `<button class="mini-btn edit" data-id="${esc(x.notion)}" data-c="${esc(x.course)}">Corriger</button>` : ''}
        <button class="mini-btn ok" data-id="${x.id}">${done ? 'Rouvrir' : 'Traité'}</button></span></div>`).join('') || '<p class="hint">Rien à signaler 🌱</p>'}</div>`;
    body.querySelectorAll('.rep-seg button').forEach((b) => b.onclick = () => { done = b.dataset.d === '1'; draw(); });
    body.querySelectorAll('.ok').forEach((b) => b.onclick = async () => { await api('report_done', { id: +b.dataset.id, undo: done }); draw(); });
    body.querySelectorAll('.edit').forEach((b) => b.onclick = () => {
      const [nat, tgt] = String(b.dataset.c).split('>');
      editSheet(b.dataset.id, (tgt || 'fr').split('-')[0], () => draw(), (nat || 'fr').split('-')[0]);
    });
  };
  await draw();
}

// ---------- Mots : toutes les langues, corrections appliquées chez tous les membres ----------
let wordLang = 'fr', wordQuery = '';
async function mots(body) {
  const d = await notions();
  body.innerHTML = `<div class="chips word-langs">${LANGS.filter((l) => ['fr', 'en', 'es', 'it', 'de', 'zh'].includes(l.code)).map((l) => `<button class="chip ${l.code === wordLang ? 'on' : ''}" data-l="${l.code}">${flag(l.variants ? l.variants[0].tag : l.code)} ${esc(l.name)}</button>`).join('')}</div>
    <input class="field word-q" type="search" placeholder="Chercher un mot, une précision, un identifiant…" value="${esc(wordQuery)}">
    <p class="hint small word-n"></p><div class="list word-list"></div>`;
  const list = body.querySelector('.word-list');
  const rows = await Promise.all(d.notions.map(async (n) => ({ n, e: await entry(n.id, wordLang), fr: await entry(n.id, 'fr') })));
  const paint = () => {
    const q = wordQuery.trim().toLowerCase();
    const hit = rows.filter(({ n, e, fr }) => !q || [n.id, e?.w, e?.note, ...(e?.alt || []), e?.py, fr?.w].some((x) => String(x || '').toLowerCase().includes(q)));
    body.querySelector('.word-n').textContent = `${hit.length} mot${hit.length > 1 ? 's' : ''}${hit.length > 150 ? ' · 150 premiers affichés' : ''}`;
    list.innerHTML = hit.slice(0, 150).map(({ n, e, fr }) => `<button class="row wrow" data-id="${esc(n.id)}"><span class="wvis">${visual({ notion: n })}</span>
      <span class="grow"><b>${esc(e?.art ? `${e.art} ` : '')}${esc(e?.w || '—')}${e?.py ? ` <small class="py">${esc(e.py)}</small>` : ''}</b>
      <small>${e?.note ? `${esc(e.note)} · ` : ''}${e?.alt?.length ? `aussi ${esc(e.alt.join(', '))} · ` : ''}${wordLang !== 'fr' ? `fr : ${esc(fr?.w || '')} · ` : ''}${esc(n.theme)} · ${n.hsk ? `HSK ${n.hsk}` : esc(n.cefr || '')}${e?.ok?.includes('admin') ? ' · corrigé' : ''}${n.picto && n.clair === false ? ' · image ambiguë' : ''}</small></span>${icon('chevron')}</button>`).join('');
    list.querySelectorAll('.wrow').forEach((b) => b.onclick = () => editSheet(b.dataset.id, wordLang, () => mots(body)));
  };
  body.querySelector('.word-q').oninput = (e) => { wordQuery = e.target.value; paint(); };
  body.querySelectorAll('.word-langs .chip').forEach((b) => b.onclick = () => { wordLang = b.dataset.l; mots(body); });
  paint();
}

// Fiche d'un mot : le mot, son article et son genre, la précision, les autres sens, le pinyin ; l'image de la notion
async function editSheet(id, lang, done, ref = 'fr') {
  const d = await notions();
  const n = d._byId.get(id);
  const orig = (d._orig || d.notions).find((x) => x.id === id);
  const e = (await entry(id, lang)) || {};
  const r = lang === ref ? null : await entry(id, ref);
  const gendered = ['fr', 'es', 'it', 'de', 'pt'].includes(lang);
  const zh = lang === 'zh';
  const sh = sheet(`<h2>${esc(e.w || id)}</h2>
    <p class="hint small">${esc(id)} · ${esc(n?.theme || '')}${r ? ` · ${esc(ref)} : ${esc(r.w || '')}` : ''}</p>
    <form class="acc-form word-form" novalidate>
      <label class="set-label" for="ew">Mot</label><input id="ew" class="field" value="${esc(e.w || '')}" maxlength="120">
      ${gendered ? `<div class="duo"><span><label class="set-label" for="ea">Article</label><input id="ea" class="field" value="${esc(e.art || '')}" maxlength="10"></span>
        <span><label class="set-label" for="eg">Genre</label><select id="eg" class="field">${['', 'm', 'f', 'n'].map((g) => `<option value="${g}" ${(e.g || '') === g ? 'selected' : ''}>${g || '—'}</option>`).join('')}</select></span></div>` : ''}
      ${zh ? `<label class="set-label" for="ep">Pinyin</label><input id="ep" class="field" value="${esc(e.py || '')}" maxlength="60">` : ''}
      <label class="set-label" for="en">Précision (en petit sous le mot)</label><input id="en" class="field" value="${esc(e.note || '')}" maxlength="120" placeholder="ex. le matin">
      <label class="set-label" for="et">Autres sens, séparés par des virgules</label><input id="et" class="field" value="${esc((e.alt || []).join(', '))}" maxlength="200">
      <button class="btn primary">Enregistrer pour tous</button>
    </form>
    ${n?.picto ? `<div class="set-label">Image</div><div class="pic-edit">${visual({ notion: n })}
      <label class="check"><input type="checkbox" id="clair" ${n.clair === false ? '' : 'checked'}> Assez claire pour « Écris ce que tu vois »</label>
      <button class="mini-btn nopic">Retirer l’image</button></div>` : ''}
    ${orig?.picto && !n?.picto ? '<button class="mini-btn restorepic">Remettre l’image</button>' : ''}
    <button class="btn ghost revert">Revenir au mot publié</button>`);
  const val = (k) => sh.querySelector(`#${k}`)?.value.trim() ?? undefined;
  const after = async (msg) => { const c = await api('content', {}); setEdits(c.edits, c.crev); toast(msg); closeSheet(); done?.(); };
  sh.querySelector('.word-form').onsubmit = async (ev) => {
    ev.preventDefault();
    if (!val('ew')) { toast('Le mot ne peut pas être vide'); return; }
    const data = { w: val('ew'), note: val('en'), alt: val('et').split(',').map((x) => x.trim()).filter(Boolean) };
    if (gendered) { data.art = val('ea'); data.g = val('eg'); }
    if (zh) data.py = val('ep');
    try { await api('content_edit', { lang, notion: id, data }); await after('Enregistré pour tous ✨'); } catch (ex) { toast(errText(ex.code)); }
  };
  sh.querySelector('#clair')?.addEventListener('change', async (ev) => {
    try { await api('content_edit', { lang: '_n', notion: id, data: { clair: ev.target.checked } }); toast('Image mise à jour'); const c = await api('content', {}); setEdits(c.edits, c.crev); } catch (ex) { toast(errText(ex.code)); }
  });
  sh.querySelector('.nopic')?.addEventListener('click', async () => {
    try { await api('content_edit', { lang: '_n', notion: id, data: { picto: '' } }); await after('Image retirée'); } catch (ex) { toast(errText(ex.code)); }
  });
  sh.querySelector('.restorepic')?.addEventListener('click', async () => {
    try { await api('content_edit', { lang: '_n', notion: id, data: { picto: orig.picto } }); await after('Image remise'); } catch (ex) { toast(errText(ex.code)); }
  });
  sh.querySelector('.revert').onclick = async () => {
    try { await api('content_edit', { lang, notion: id, data: null }); await after('Mot publié rétabli'); } catch (ex) { toast(errText(ex.code)); }
  };
}

// ---------- Annonce ----------
function annonce(body, ov, reload) {
  const a = ov.announce;
  body.innerHTML = `<p class="hint">Le message s’affiche une fois en haut de l’accueil de chaque membre, jusqu’à ce qu’il le ferme.</p>
    ${a ? `<div class="announce preview">${icon('flag')}<p>${esc(a.text)}</p></div><p class="hint small">Publiée le ${esc(date(a.id))}</p>` : '<p class="hint small">Aucune annonce en cours.</p>'}
    <form class="acc-form ann-form" novalidate><label class="set-label" for="at">Nouveau message</label>
      <textarea id="at" class="field" rows="3" maxlength="400" placeholder="Nouveau jeu : Duo ! Relie les mots à leur traduction.">${esc(a?.text || '')}</textarea>
      <button class="btn primary">Publier</button></form>
    ${a ? '<button class="btn ghost clear">Retirer l’annonce</button>' : ''}`;
  body.querySelector('.ann-form').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('announce_set', { text: body.querySelector('#at').value }); toast('Annonce publiée ✨'); reload(); } catch (ex) { toast(errText(ex.code)); }
  };
  body.querySelector('.clear')?.addEventListener('click', async () => { await api('announce_set', { text: '' }); toast('Annonce retirée'); reload(); });
}

// ---------- Serveur et statistiques ----------
const MODE = { review: 'Réviser', quiz: 'Quiz', memory: 'Memory', write: 'Écris ce que tu vois', discover: 'Découvrir' };
function serveur(body, ov) {
  const s = ov.server, days = ov.stats.days;
  const keys = ov.stats.keys || Object.keys(days);
  const vals = keys.map((k) => days[k] || 0), max = Math.max(1, ...vals);
  const modes = Object.entries(ov.stats.modes).sort((a, b) => b[1] - a[1]);
  const total = modes.reduce((x, [, n]) => x + n, 0) || 1;
  body.innerHTML = `<div class="set-label">Réponses par jour (30 jours, tous membres)</div>
    <div class="panel"><div class="bars">${vals.map((v, i) => `<i style="height:${(v / max) * 100}%" title="${keys[i]} · ${v}"></i>`).join('')}</div>
    <p class="hint small">${vals.reduce((a, b) => a + b, 0)} réponses · pic ${max} en un jour</p></div>
    <div class="set-label">Modes les plus joués (30 jours)</div>
    <div class="panel">${modes.map(([m, n]) => `<div class="lvl-row"><b>${esc(MODE[m] || m)}</b><span class="bar"><span class="mas" style="width:${(n / total) * 100}%"></span></span><small>${n}</small></div>`).join('') || '<p class="hint small">Pas encore de réponses.</p>'}</div>
    <div class="set-label">Serveur</div>
    <div class="panel kv"><span>Version serveur</span><b>${esc(s.version)}</b><span>PHP</span><b>${esc(s.php)} · ${s.bits} bits</b>
      <span>Base de données</span><b>${(s.db_bytes / 1048576).toFixed(1)} Mo · ${s.records} enregistrements</b></div>
    <div class="set-label">Dernières erreurs</div>
    <div class="panel">${s.errors.length ? s.errors.map((x) => `<p class="err-row"><small>${esc(ago(+x.ts))} · ${esc(x.route)}</small><br>${esc(x.msg)}</p>`).join('') : '<p class="hint small">Aucune erreur 🌱</p>'}</div>`;
}
