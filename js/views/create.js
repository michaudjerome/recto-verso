// Créer : on remplit le recto, la carte se retourne, on remplit le verso
import { base } from '../langs.js';
import { t, langName } from '../i18n.js';
import { cardsOf, savePerso, deleteCard } from '../cards.js';
import { word, picto } from '../face.js';
import { requireCourse, topBar } from '../play-kit.js';
import { esc, flip, toast } from '../ui.js';

export async function render(el) {
  const course = await requireCourse();
  if (!course) return;
  const zh = base(course.target) === 'zh';
  const mine = (await cardsOf(course.id)).filter((c) => !c.notion).sort((a, b) => b.created - a.created);

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
        <label class="lbl">${esc(t('create.ex'))}</label><input class="field" id="ex" autocomplete="off">
        <label class="lbl">${esc(t('create.emoji'))}</label><input class="field center" id="pi" maxlength="8" autocomplete="off">
        <div class="duo"><button class="btn ghost turn">↺</button><button class="btn primary save">${esc(t('create.save'))}</button></div></div></div></div></div>
    <div class="set-label">${esc(t('create.mine'))}</div>
    <div class="course-list mine">${mine.length ? mine.map((c) => `<div class="course-row static"><span class="m-pict">${picto(c.perso?.picto) || ''}</span>
      <span><b>${word(c.perso.front, course.target)}</b><small>${esc(c.perso.back?.w || '')}</small></span>
      <button class="mini-btn del" data-id="${esc(c.id)}">${esc(t('create.delete'))}</button></div>`).join('') : `<p class="hint">${esc(t('create.none'))}</p>`}</div></div>`;

  const card = el.querySelector('.card');
  const $ = (id) => el.querySelector(`#${id}`);
  el.querySelectorAll('.turn').forEach((b) => b.onclick = () => {
    flip(card);
    setTimeout(() => (card.classList.contains('flipped') ? $('bw') : $('fw')).focus(), 400);
  });
  $('fw').onkeydown = (e) => { if (e.key === 'Enter') el.querySelector('.front .turn').click(); };
  el.querySelector('.save').onclick = async () => {
    const fw = $('fw').value.trim(), bw = $('bw').value.trim();
    if (!fw || !bw) { toast(t('create.need')); if (!fw) flip(card, false); return; }
    await savePerso(course, { front: { w: fw, py: zh ? $('fpy').value.trim() : undefined }, back: { w: bw }, ex: $('ex').value.trim(), picto: $('pi').value.trim() });
    toast(t('create.saved'));
    render(el);
  };
  el.querySelectorAll('.del').forEach((b) => b.onclick = async () => {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = t('create.confirm'); setTimeout(() => { b.classList.remove('armed'); b.textContent = t('create.delete'); }, 4000); return; }
    await deleteCard(b.dataset.id);
    render(el);
  });
}
