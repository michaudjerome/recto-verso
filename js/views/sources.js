// Sources et licences (obligations des licences libres utilisées)
import { t } from '../i18n.js';
import { esc, icon } from '../ui.js';

const ITEMS = [
  ['OpenMoji', 'Pictogrammes · All emojis designed by OpenMoji – the open-source emoji and icon project', 'CC BY-SA 4.0', 'https://openmoji.org/', 'LICENSES/CC-BY-SA-4.0-OpenMoji-CC-CEDICT-contenu.txt'],
  ['CFDICT', 'Dictionnaire chinois-français · chine.in (David Houstin)', 'CC BY-SA 3.0', 'https://chine.in/mandarin/open/CFDICT/', 'LICENSES/CC-BY-SA-3.0-CFDICT.txt'],
  ['CC-CEDICT', 'Dictionnaire chinois-anglais · MDBG, vérification des traductions anglaises', 'CC BY-SA 4.0', 'https://www.mdbg.net/chinese/dictionary?page=cc-cedict', 'LICENSES/CC-BY-SA-4.0-OpenMoji-CC-CEDICT-contenu.txt'],
  ['HSK 3.0', 'Liste de vocabulaire et niveaux · ivankra/hsk30', 'MIT', 'https://github.com/ivankra/hsk30', 'LICENSES/MIT-hsk30.txt'],
  ['hsk30 (Python)', 'Niveaux HSK 1 et 2 des 774 notions ajoutées · harukicoder/hsk30', 'MIT', 'https://github.com/harukicoder/hsk30', 'LICENSES/MIT-hsk30-harukicoder.txt'],
  ['Wiktionary · Wiktionnaire', 'Vérification des traductions (anglais, français, espagnol, italien, allemand)', 'CC BY-SA 4.0', 'https://www.wiktionary.org/', 'LICENSES/CC-BY-SA-4.0-OpenMoji-CC-CEDICT-contenu.txt'],
  ['Contenu Recto Verso', 'Notions et mots (data/) dérivés des sources ci-dessus', 'CC BY-SA 4.0', 'https://github.com/michaudjerome/recto-verso', 'LICENSES/CC-BY-SA-4.0-OpenMoji-CC-CEDICT-contenu.txt'],
  ['ts-fsrs', 'Répétition espacée FSRS', 'MIT', 'https://github.com/open-spaced-repetition/ts-fsrs', 'LICENSES/MIT-ts-fsrs.txt'],
  ['Fraunces', 'Police des titres', 'SIL OFL 1.1', 'https://github.com/undercasetype/Fraunces', 'LICENSES/OFL-Fraunces.txt'],
  ['Inter', 'Police du texte', 'SIL OFL 1.1', 'https://github.com/rsms/inter', 'LICENSES/OFL-Inter.txt'],
  ['LXGW WenKai', 'Police des caractères chinois', 'SIL OFL 1.1', 'https://github.com/lxgw/LxgwWenKai', 'LICENSES/OFL-LXGW-WenKai.txt'],
  ['Recto Verso', 'Code de l\'application', 'MIT', 'https://github.com/michaudjerome/recto-verso', 'LICENSES/MIT-app.txt'],
];

export function render(el) {
  el.innerHTML = `<div class="page enter">
    <div class="top"><a class="icon-btn" href="#/reglages" aria-label="${esc(t('ui.back'))}">${icon('back')}</a><span class="ttl">${esc(t('set.sources'))}</span><span style="width:40px"></span></div>
    <div class="course-list">${ITEMS.map(([n, what, lic, url, file]) => `<div class="course-row static src"><span><b>${esc(n)}</b><small>${esc(what)} · ${esc(lic)}</small>
      <small><a href="${url}" target="_blank" rel="noopener">${esc(url.replace('https://', ''))}</a> · <a href="${file}" target="_blank">licence</a></small></span></div>`).join('')}</div>
  </div>`;
}
