// Créer : on remplit le recto, la carte se retourne, on remplit le verso (traduction, photo ou émoji)
import { base } from '../langs.js';
import { t, langName } from '../i18n.js';
import { cardsOf, savePerso, deleteCard } from '../cards.js';
import { word, visual } from '../face.js';
import { compress, savePhoto, photoUrl, deletePhoto } from '../photos.js';
import { requireCourse, topBar } from '../play-kit.js';
import { esc, flip, toast } from '../ui.js';

export async function render(el) {
  const course = await requireCourse();
  if (!course) return;
  const zh = base(course.target) === 'zh';
  const mine = (await cardsOf(course.id)).filter((c) => !c.notion).sort((a, b) => b.created - a.created);
  const thumbs = await Promise.all(mine.map(async (c) => visual({ photoUrl: await photoUrl(c.perso?.photo), picto: c.perso?.picto }, 'thumb')));
  let photo = null; // blob compressé en attente d'enregistrement

  el.innerHTML = `<div class="page create">${topBar(t('create.title'))}
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
