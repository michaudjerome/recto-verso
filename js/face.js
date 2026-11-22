// Les deux faces d'une carte : recto (langue apprise), verso (langue maternelle, image, exemple)
import { base } from './langs.js';
import { t } from './i18n.js';
import { esc } from './ui.js';
import { toneHtml } from './pinyin.js';

// Image d'une carte : photo perso, sinon pictogramme OpenMoji (téléchargé à la demande, gardé hors ligne),
// sinon l'émoji du téléphone si le picto ne charge pas, ou un émoji saisi à la main
const emoji = (code) => { try { return String.fromCodePoint(...code.split('-').map((h) => parseInt(h, 16))); } catch { return ''; } };
export const hasVisual = (txt) => !!(txt?.photoUrl || txt?.picto || txt?.notion?.img || txt?.notion?.picto);
// Image assez parlante pour deviner le mot sans aide (Écris ce que tu vois) : photo perso, ou picto jugé clair
// (« clair: false » dans les notions : un lapin pour « rapide », une chaise pour « s'asseoir »…)
// Les illustrations dessinées pour l'app (« img ») ne sont publiées que si elles sont sans ambiguïté
export const hasClearVisual = (txt) => !!(txt?.photoUrl || txt?.picto || txt?.notion?.img || (txt?.notion?.picto && txt.notion.clair !== false));
export function visual(txt, cls = '') {
  if (txt?.photoUrl) return `<img class="vis ph ${cls}" src="${esc(txt.photoUrl)}" alt="">`;
  if (!txt?.picto && txt?.notion?.img) return `<img class="vis ai ${cls}" src="img/${esc(txt.notion.img)}.webp" alt="">`;
  const code = txt?.picto || txt?.notion?.picto;
  if (!code) return '';
  if (!/^[0-9A-F-]+$/i.test(code)) return `<span class="vis em ${cls}">${esc(code)}</span>`;
  return `<img class="vis pm ${cls}" src="pictos/${code}.svg" alt="" data-e="${emoji(code)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:this.className.replace('pm','em'),textContent:this.dataset.e}))">`;
}

// Mot avec son article coloré selon le genre (der Apfel, la pomme), ou caractères chinois
// La précision (« le matin » pour bonjour) s'affiche en petit sous le mot
export function word(e, tag, { big = false, note = true } = {}) {
  if (!e?.w) return '';
  if (base(tag) === 'zh') return `<span class="hz zh ${big ? 'big' : ''}">${esc(e.w)}</span>`;
  const elided = /['’]$/.test(e.art || ''); // l'école : pas d'espace après l'apostrophe
  const art = e.art ? `<span class="art g-${esc(e.g || '')}">${esc(e.art)}</span>${elided ? '' : ' '}` : '';
  const n = note && e.note ? `<span class="wnote">${esc(e.note)}</span>` : '';
  return `<span class="w ${big ? 'big' : ''}">${art}${esc(e.w)}${n}</span>`;
}

// Autres sens d'un mot chinois (家 : famille, mais aussi maison), montrés seulement quand on apprend le chinois
export const altLine = (e) => (e?.alt?.length ? `<div class="alt-line">${esc(t('card.also', { w: e.alt.join(', ') }))}</div>` : '');

export const pinyinHtml = (e) => (e?.py ? `<span class="py">${toneHtml(e.py)}</span>` : '');

export function frontHTML(txt, course, { showPy = false, hint = '' } = {}) {
  const zh = base(course.target) === 'zh';
  return `<div class="corner">Recto</div>
    ${word(txt.front, course.target, { big: true })}
    ${zh ? `<div class="py-line ${showPy ? 'show' : ''}">${pinyinHtml(txt.front)}</div>` : ''}
    ${hint ? `<div class="hint-line">${esc(hint)}</div>` : ''}`;
}

export function backHTML(txt, course) {
  const p = visual(txt);
  const zh = base(course.target) === 'zh';
  const ex = txt.front?.ex || txt.ex;
  return `<div class="corner r">Verso</div>
    ${p ? `<div class="pict">${p}</div>` : ''}
    <div class="tr">${word(txt.back, course.native)}</div>
    ${zh ? altLine(txt.back) : ''}
    <div class="recall">${word(txt.front, course.target)}${zh ? ` ${pinyinHtml(txt.front)}` : ''}</div>
    ${ex ? `<div class="ex ${zh ? 'zh' : ''}">${esc(ex)}</div>` : ''}
    ${txt.check?.label === 'unreviewed' ? `<div class="badge">${esc(t('card.unreviewed'))}</div>` : ''}`;
}

export const cardShell = (front, back, cls = '') =>
  `<div class="card flip ${cls}"><div class="in"><div class="face front">${front}</div><div class="face back">${back}</div></div></div>`;
