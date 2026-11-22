// Signaler un mot : traduction fausse, image ambiguë ou autre ; l'administrateur le voit dans l'Admin
import { t } from './i18n.js';
import { api } from './api.js';
import { esc, icon, sheet, closeSheet, toast } from './ui.js';

// Remplace l'espace vide à droite de la barre du haut par un petit drapeau ; getNotion() donne la notion affichée
export function reportButton(el, course, getNotion) {
  const slot = el.querySelector('.top > span:last-child');
  if (!slot) return;
  const b = document.createElement('button');
  b.className = 'icon-btn report-btn';
  b.setAttribute('aria-label', t('rep.title'));
  b.innerHTML = icon('flag');
  b.onclick = () => { const id = getNotion(); if (id) reportSheet(id, course); else toast(t('rep.perso')); };
  slot.replaceWith(b);
}

export function reportSheet(notion, course) {
  const kinds = ['translation', 'picture', 'other'];
  const sh = sheet(`<h2>${esc(t('rep.title'))}</h2><p class="hint">${esc(t('rep.hint'))}</p>
    <div class="chips rep-kinds">${kinds.map((k, i) => `<button class="chip ${i ? '' : 'on'}" data-k="${k}">${esc(t(`rep.${k}`))}</button>`).join('')}</div>
    <textarea class="field rep-c" rows="3" maxlength="500" placeholder="${esc(t('rep.ph'))}"></textarea>
    <button class="btn primary send">${esc(t('rep.send'))}</button>`);
  let kind = 'translation';
  sh.querySelectorAll('.rep-kinds .chip').forEach((c) => c.onclick = () => { kind = c.dataset.k; sh.querySelectorAll('.rep-kinds .chip').forEach((x) => x.classList.toggle('on', x === c)); });
  sh.querySelector('.send').onclick = async (e) => {
    e.currentTarget.disabled = true;
    try { await api('report_new', { notion, course: course.id, kind, comment: sh.querySelector('.rep-c').value }); closeSheet(); toast(t('rep.thanks')); }
    catch { e.currentTarget.disabled = false; toast(t('acc.err.offline')); }
  };
}
