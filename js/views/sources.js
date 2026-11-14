// Sources et licences (obligations des licences libres utilisées)
import { t } from '../i18n.js';
import { esc, icon } from '../ui.js';

const ITEMS = [
  ['ts-fsrs', 'Répétition espacée FSRS', 'MIT', 'https://github.com/open-spaced-repetition/ts-fsrs', 'LICENSES/MIT-ts-fsrs.txt'],
  ['Fraunces', 'Police des titres', 'SIL OFL 1.1', 'https://github.com/undercasetype/Fraunces', 'LICENSES/OFL-Fraunces.txt'],
  ['Inter', 'Police du texte', 'SIL OFL 1.1', 'https://github.com/rsms/inter', 'LICENSES/OFL-Inter.txt'],
  ['LXGW WenKai', 'Police des caractères chinois', 'SIL OFL 1.1', 'https://github.com/lxgw/LxgwWenKai', 'LICENSES/OFL-LXGW-WenKai.txt'],
];

export function render(el) {
  el.innerHTML = `<div class="page enter">
    <div class="top"><a class="icon-btn" href="#/reglages" aria-label="${esc(t('ui.back'))}">${icon('back')}</a><span class="ttl">${esc(t('set.sources'))}</span><span style="width:40px"></span></div>
    <div class="course-list">${ITEMS.map(([n, what, lic, url, file]) => `<div class="course-row static src"><span><b>${esc(n)}</b><small>${esc(what)} · ${esc(lic)}</small>
      <small><a href="${url}" target="_blank" rel="noopener">${esc(url.replace('https://', ''))}</a> · <a href="${file}" target="_blank">licence</a></small></span></div>`).join('')}</div>
    <p class="hint small">Les dictionnaires et les pictogrammes seront listés ici quand ils seront intégrés (CFDICT, liste HSK 3.0, Make Me a Hanzi, OpenMoji, Wiktionnaire).</p>
  </div>`;
}
