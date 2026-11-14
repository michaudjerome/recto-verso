// Les deux faces d'une carte : recto (langue apprise), verso (langue maternelle, image, exemple)
import { base } from './langs.js';
import { t } from './i18n.js';
import { esc } from './ui.js';
import { toneHtml } from './pinyin.js';

// Code OpenMoji / Unicode (« 1F34E ») → émoji affiché par le téléphone, en attendant les pictos de l'étape 5
export const picto = (code) => {
  if (!code) return '';
  if (!/^[0-9A-F-]+$/i.test(code)) return esc(code); // émoji saisi à la main dans une carte perso
  try { return String.fromCodePoint(...code.split('-').map((h) => parseInt(h, 16))); } catch { return ''; }
};

// Mot avec son article coloré selon le genre (der Apfel, la pomme), ou caractères chinois
export function word(e, tag, { big = false } = {}) {
  if (!e?.w) return '';
  if (base(tag) === 'zh') return `<span class="hz zh ${big ? 'big' : ''}">${esc(e.w)}</span>`;
  const art = e.art ? `<span class="art g-${esc(e.g || '')}">${esc(e.art)}</span> ` : '';
  return `<span class="w ${big ? 'big' : ''}">${art}${esc(e.w)}</span>`;
}

export const pinyinHtml = (e) => (e?.py ? `<span class="py">${toneHtml(e.py)}</span>` : '');

export function frontHTML(txt, course, { showPy = false, hint = '' } = {}) {
  const zh = base(course.target) === 'zh';
  return `<div class="corner">Recto</div>
    ${word(txt.front, course.target, { big: true })}
    ${zh ? `<div class="py-line ${showPy ? 'show' : ''}">${pinyinHtml(txt.front)}</div>` : ''}
    ${hint ? `<div class="hint-line">${esc(hint)}</div>` : ''}`;
}

export function backHTML(txt, course) {
  const p = picto(txt.picto || txt.notion?.picto);
  const zh = base(course.target) === 'zh';
  const ex = txt.front?.ex || txt.ex;
  return `<div class="corner r">Verso</div>
    ${p ? `<div class="pict">${p}</div>` : ''}
    <div class="tr">${word(txt.back, course.native)}</div>
    <div class="recall">${word(txt.front, course.target)}${zh ? ` ${pinyinHtml(txt.front)}` : ''}</div>
    ${ex ? `<div class="ex ${zh ? 'zh' : ''}">${esc(ex)}</div>` : ''}
    ${txt.check?.label === 'unreviewed' ? `<div class="badge">${esc(t('card.unreviewed'))}</div>` : ''}`;
}

export const cardShell = (front, back, cls = '') =>
  `<div class="card flip ${cls}"><div class="in"><div class="face front">${front}</div><div class="face back">${back}</div></div></div>`;
