// Créer : un seul champ cherche le mot (langue apprise, sa langue ou pinyin) dans l'app puis, pour le chinois,
// dans le dictionnaire ; sinon on remplit le recto, la carte se retourne, on remplit le verso (photo ou émoji)
import { base } from '../langs.js';
import { t, langName } from '../i18n.js';
import { cardsOf, savePerso, deleteCard, addNotion, cardId } from '../cards.js';
import { searchNotions, loadDict, dictReady, searchDict, shortDefs, dictLang } from '../dict.js';
import { toneHtml } from '../pinyin.js';
import { get } from '../db.js';
import { word, visual } from '../face.js';
import { compress, savePhoto, photoUrl, deletePhoto } from '../photos.js';
import { requireCourse, topBar } from '../play-kit.js';
import { esc, flip, toast, icon, nav } from '../ui.js';

export async function render(el) {
  const course = await requireCourse();
  if (!course) return;
  const zh = base(course.target) === 'zh';
  const mine = (await cardsOf(course.id)).filter((c) => !c.notion).sort((a, b) => b.created - a.created);
  const thumbs = await Promise.all(mine.map(async (c) => visual({ photoUrl: await photoUrl(c.perso?.photo), picto: c.perso?.picto }, 'thumb')));
  let photo = null; // blob compressé en attente d'enregistrement

  const ph = t(zh ? 'create.searchPy' : 'create.search', { a: langName(course.target), b: langName(course.native) });
  el.innerHTML = `<div class="page create">${topBar(t('create.title'))}
    <label class="searchbox">${icon('search')}<input id="q" type="search" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>
    <div class="results" id="res"></div>
    <div class="stage form-stage"><div class="card flip"><div class="in">
      <div class="face front"><div class="corner">Recto</div>
        <label class="lbl">${esc(t('create.front', { lang: langName(course.target) }))}</label>
        <input class="field center big" id="fw" autocomplete="off" autocapitalize="off" spellcheck="false">
        ${zh ? `<label class="lbl">${esc(t('create.py'))}</label><input class="field center" id="fpy" autocomplete="off" autocapitalize="off" spellcheck="false">` : ''}
        <button class="btn primary turn">${esc(t('create.flip'))} ↻</button></div>
      <div class="face back"><div class="corner r">Verso</div>
        <label class="lbl">${esc(t('create.back', { lang: langName(course.native) }))}</label>
        <input class="field center big" id="bw" autocomplete="off" spellcheck="false">
        <div class="photo-row">
          <label class="photo-btn"><input type="file" accept="image/*" capture="environment" id="ph" hidden><span class="ph-prev">📷</span><span class="ph-txt">${esc(t('create.photo'))}</span></label>
          <input class="field center emoji" id="pi" maxlength="8" autocomplete="off" placeholder="${esc(t('create.emojiShort'))}">
        </div>
        <label class="lbl">${esc(t('create.ex'))}</label><input class="field" id="ex" autocomplete="off">
        <div class="duo"><button class="btn ghost turn">↺</button><button class="btn primary save">${esc(t('create.save'))}</button></div></div></div></div></div>
    <div class="set-label">${esc(t('create.mine'))}</div>
    <div class="course-list mine">${mine.length ? mine.map((c, i) => `<div class="course-row static">${thumbs[i] || '<span class="thumb-empty"></span>'}
      <span><b>${word(c.perso.front, course.target)}</b><small>${esc(c.perso.back?.w || '')}</small></span>
      <button class="mini-btn del" data-id="${esc(c.id)}">${esc(t('create.delete'))}</button></div>`).join('') : `<p class="hint">${esc(t('create.none'))}</p>`}</div></div>`;

  const card = el.querySelector('.card');
  const $ = (id) => el.querySelector(`#${id}`);

  // Recherche : notions de l'app d'abord, puis dictionnaire chinois (téléchargé une fois, puis hors ligne)
  const res = $('res'), gen = nav.gen;
  let timer, lastQ = '', dictRows = [];
  if (zh) loadDict(course.native).then(() => { if (lastQ && nav.gen === gen) run(lastQ); }).catch(() => {});
  const run = async (q) => {
    lastQ = q;
    if (!q.trim()) { res.innerHTML = ''; return; }
    const found = await searchNotions(q, course, 8);
    const have = await Promise.all(found.map((it) => get('cards', cardId(course.id, it.n.id))));
    if (q !== lastQ || nav.gen !== gen) return;
    const ids = new Set(found.map((it) => it.hz));
    dictRows = zh && dictReady() ? searchDict(q).filter((g) => !ids.has(g.hanzi)).slice(0, 12) : [];
    let html = '';
    if (found.length) html += `<div class="set-label">${esc(t('create.inApp'))}</div><div class="list">${found.map((it, i) => `<button class="row app-hit" data-id="${esc(it.n.id)}" ${have[i] ? 'disabled' : ''}>
      ${visual({ picto: it.n.picto }, 'thumb') || '<span class="thumb-empty"></span>'}
      <span class="grow"><b>${word(it.tg, course.target)}</b>${zh && it.tg.py ? ` <span class="py">${toneHtml(it.tg.py)}</span>` : ''}<small>${esc(it.nt.art ? `${it.nt.art}${it.nt.art.endsWith("'") ? '' : ' '}${it.nt.w}` : it.nt.w)}</small></span>
      <span class="tag">${esc(t(have[i] ? 'create.have' : 'create.add'))}</span></button>`).join('')}</div>`;
    if (zh) {
      if (!dictReady()) html += `<p class="hint small">${esc(t('create.loading'))}</p>`;
      else if (dictRows.length) html += `<div class="set-label">${esc(t('create.dict'))}</div><div class="list">${dictRows.map((g, gi) => g.readings.slice(0, 3).map((r, ri) => `<button class="row dict-hit" data-g="${gi}" data-r="${ri}">
        <span class="hz zh">${esc(g.hanzi)}</span><span class="grow"><span class="py">${toneHtml(r.pinyin)}</span><small>${esc(shortDefs(r.defs, 3))}</small></span>${g.level ? `<span class="tag hsk">HSK ${g.level}</span>` : ''}</button>`).join('')).join('')}</div>`;
    }
    if (!found.length && !(zh && dictRows.length) && (dictReady() || !zh)) html += `<p class="hint small">${esc(t('create.noResult'))}</p>`;
    html += `<button class="btn ghost manual">${esc(t('create.manual'))}</button>`;
    res.innerHTML = html;
  };
  $('q').oninput = () => { clearTimeout(timer); timer = setTimeout(() => run($('q').value), 180); };
  res.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('app-hit')) {
      await addNotion(course, b.dataset.id);
      toast(t('disc.kept'));
      b.disabled = true; b.querySelector('.tag').textContent = t('create.have');
      return;
    }
    if (b.classList.contains('dict-hit')) {
      const g = dictRows[+b.dataset.g], r = g.readings[+b.dataset.r];
      $('fw').value = g.hanzi; if ($('fpy')) $('fpy').value = r.pinyin;
      $('bw').value = shortDefs(r.defs, 2);
      if (dictLang(course.native) !== base(course.native)) toast(t('create.translate'));
    } else if (b.classList.contains('manual')) {
      const q = $('q').value.trim();
      if (q && !$('fw').value) $('fw').value = q;
    }
    card.classList.contains('flipped') && flip(card, false);
    el.querySelector('.form-stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('fw').focus({ preventScroll: true }), 350);
  };
  el.querySelectorAll('.turn').forEach((b) => b.onclick = () => {
    flip(card);
    setTimeout(() => (card.classList.contains('flipped') ? $('bw') : $('fw')).focus(), 400);
  });
  $('fw').onkeydown = (e) => { if (e.key === 'Enter') el.querySelector('.front .turn').click(); };

  // Photo : compressée tout de suite, aperçu dans le bouton
  $('ph').onchange = async () => {
    const f = $('ph').files?.[0];
    if (!f) return;
    try {
      photo = await compress(f);
      const prev = el.querySelector('.ph-prev');
      prev.innerHTML = `<img src="${URL.createObjectURL(photo)}" alt="">`;
      el.querySelector('.ph-txt').textContent = t('create.photoChange');
    } catch { toast(t('ui.error')); }
  };

  el.querySelector('.save').onclick = async () => {
    const fw = $('fw').value.trim(), bw = $('bw').value.trim();
    if (!fw || !bw) { toast(t('create.need')); if (!fw) flip(card, false); return; }
    const photoId = photo ? await savePhoto(photo) : '';
    await savePerso(course, { front: { w: fw, py: zh ? $('fpy').value.trim() : undefined }, back: { w: bw }, ex: $('ex').value.trim(), picto: $('pi').value.trim(), photo: photoId });
    toast(t('create.saved'));
    render(el);
  };
  el.querySelectorAll('.del').forEach((b) => b.onclick = async () => {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = t('create.confirm'); setTimeout(() => { b.classList.remove('armed'); b.textContent = t('create.delete'); }, 4000); return; }
    const c = mine.find((x) => x.id === b.dataset.id);
    await deletePhoto(c?.perso?.photo);
    await deleteCard(b.dataset.id);
    render(el);
  });
}
