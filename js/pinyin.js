// Pinyin : couleur des tons et comparaison sans les tons (repris de « J'apprends le chinois »)
import { esc } from './ui.js';

const MARKS = { ā: 'a', á: 'a', ǎ: 'a', à: 'a', ē: 'e', é: 'e', ě: 'e', è: 'e', ī: 'i', í: 'i', ǐ: 'i', ì: 'i', ō: 'o', ó: 'o', ǒ: 'o', ò: 'o', ū: 'u', ú: 'u', ǔ: 'u', ù: 'u', ǖ: 'ü', ǘ: 'ü', ǚ: 'ü', ǜ: 'ü' };
export const strip = (s) => String(s || '').replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (c) => MARKS[c]);

const INI = '(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?';
const FIN = ['iang', 'iong', 'uang', 'ueng', 'ang', 'eng', 'ing', 'ong', 'ian', 'iao', 'uai', 'uan', 'van', 'ai', 'ao', 'an', 'ei', 'en', 'er', 'ia', 'ie', 'in', 'iu', 'ou', 'ua', 'uo', 'ui', 'un', 've', 'ue', 'a', 'o', 'e', 'i', 'u', 'v', 'n', 'ng', 'm'];
const SYL = new RegExp(`^${INI}(?:${FIN.join('|')})r?$`);
const TONE = { 1: /[āēīōūǖ]/, 2: /[áéíóúǘ]/, 3: /[ǎěǐǒǔǚ]/, 4: /[àèìòùǜ]/ };
const toneOf = (s) => +(Object.keys(TONE).find((t) => TONE[t].test(s)) || 0);

function split(word) {
  const base = strip(word).toLowerCase();
  const memo = new Map();
  const go = (i) => {
    if (i === base.length) return [];
    if (memo.has(i)) return memo.get(i);
    let res = null;
    for (let j = Math.min(base.length, i + 7); j > i && !res; j--) {
      if (SYL.test(base.slice(i, j).replace(/ü/g, 'v'))) { const rest = go(j); if (rest) res = [[i, j], ...rest]; }
    }
    memo.set(i, res);
    return res;
  };
  return (go(0) || [[0, word.length]]).map(([a, b]) => word.slice(a, b));
}

export function toneHtml(py) {
  return String(py || '').split(/([\s'’]+)/).map((part) => {
    if (!part || /^[\s'’]+$/.test(part)) return esc(part);
    if (!/[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/.test(part)) return esc(part);
    return split(part).map((s) => `<span class="t${toneOf(s)}">${esc(s)}</span>`).join('');
  }).join('');
}
