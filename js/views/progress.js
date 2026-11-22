// Progrès : mots maîtrisés au fil du temps, calendrier des jours de révision, répartition par niveau.
// Tout est calculé sur l'appareil à partir des cartes et de l'historique (synchronisés avec le compte).
import { base } from '../langs.js';
import { t, locale, langName } from '../i18n.js';
import { requireCourse, topBar } from '../play-kit.js';
import { cardsOf } from '../cards.js';
import { getAllByIndex } from '../db.js';
import { notions } from '../content.js';
import { streakOf } from '../courses.js';
import { fsrs, createEmptyCard, Rating, State } from '../vendor/ts-fsrs.mjs';
import { esc, dayKey } from '../ui.js';

const MASTERED = 21; // une carte est maîtrisée quand son intervalle atteint 21 jours
const DAY = 864e5;
const replay = fsrs({ request_retention: 0.9, enable_fuzz: false, maximum_interval: 3650 });
const isMastered = (c) => c?.fsrs && c.fsrs.state === State.Review && (c.fsrs.scheduled_days || 0) >= MASTERED;

// Rejoue les révisions de chaque carte pour savoir quel jour elle est devenue (ou a cessé d'être) maîtrisée
function masteryCurve(cards, logs, days) {
  const byCard = new Map();
  for (const l of logs) if (l.mode === 'review' && l.rating) (byCard.get(l.card) || byCard.set(l.card, []).get(l.card)).push(l);
  const delta = new Map(); // jour → variation du nombre de cartes maîtrisées
  for (const c of cards) {
    const ls = (byCard.get(c.id) || []).sort((a, b) => a.ts - b.ts);
    let fc = createEmptyCard(new Date(c.created || ls[0]?.ts || Date.now())), was = false;
    for (const l of ls) {
      try { fc = replay.next(fc, new Date(l.ts), l.rating).card; } catch { continue; }
      const now = fc.state === State.Review && fc.scheduled_days >= MASTERED;
      if (now !== was) { const d = dayKey(new Date(l.ts)); delta.set(d, (delta.get(d) || 0) + (now ? 1 : -1)); was = now; }
    }
  }
  // Cumul jour par jour sur la période affichée (le point de départ compte tout ce qui précède)
  const first = days[0];
  let level = [...delta].filter(([d]) => d < first).reduce((s, [, v]) => s + v, 0);
  return days.map((d) => (level += delta.get(d) || 0));
}

function lineChart(values, labels) {
  const W = 320, H = 140, P = 8, B = 22, max = Math.max(4, ...values);
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, values.length - 1);
  const y = (v) => H - B - (v / max) * (H - B - P - 16);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('prog.curve'))}">
    <line x1="${P}" y1="${H - B}" x2="${W - P}" y2="${H - B}" class="axis"/>
    <polygon points="${P},${H - B} ${pts} ${W - P},${H - B}" class="area"/>
    <polyline points="${pts}" class="line"/>
    <circle cx="${x(values.length - 1)}" cy="${y(last)}" r="4" class="dot"/>
    <text x="${x(values.length - 1) - 6}" y="${y(last) - 9}" text-anchor="end" class="val">${last}</text>
    <text x="${P}" y="${H - 5}" class="lbl">${esc(labels[0])}</text>
    <text x="${W - P}" y="${H - 5}" text-anchor="end" class="lbl">${esc(labels[1])}</text></svg>`;
}

export async function render(el) {
  const course = await requireCourse();
  if (!course) return;
  const zh = base(course.target) === 'zh';
  const [cards, logs, data] = await Promise.all([cardsOf(course.id), getAllByIndex('logs', 'course', course.id), notions()]);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const days = Array.from({ length: 90 }, (_, i) => dayKey(new Date(+today - (89 - i) * DAY)));
  const curve = masteryCurve(cards, logs, days);
  const mastered = cards.filter(isMastered).length;
  const perDay = new Map();
  for (const l of logs) perDay.set(l.day, (perDay.get(l.day) || 0) + 1);
  const last30 = days.slice(-30).reduce((s, d) => s + (perDay.get(d) || 0), 0);
  const fmt = (d) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00`));

  // Calendrier : 12 semaines, du lundi au dimanche, intensité selon le nombre de réponses
  const start = new Date(today); start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 77); // lundi, 11 semaines avant
  const cells = [];
  const end = dayKey(today);
  for (let d = new Date(start); dayKey(d) <= end; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d), n = perDay.get(k) || 0;
    cells.push(`<i class="c${n ? Math.min(4, 1 + Math.floor(Math.log2(n) / 1.6)) : 0}" title="${esc(fmt(k))} · ${n}"></i>`);
  }

  // Répartition par niveau : cartes possédées et maîtrisées, sur le total du contenu
  const RANK = { beginner: 1, A1: 1, A2: 2, B1: 3, B2: 3 };
  const tier = (n) => Math.max(1, Math.min(zh ? n.hsk || 3 : RANK[n.cefr] ?? 3, 3));
  const name = (k) => (zh ? `HSK ${k}` : ['', 'A1', 'A2', 'B1'][k]) + (k === 3 ? '+' : '');
  const byId = new Map(cards.map((c) => [c.notion, c]));
  const rows = [1, 2, 3].map((k) => {
    const all = data.notions.filter((n) => tier(n) === k);
    const own = all.filter((n) => byId.has(n.id));
    const mas = own.filter((n) => isMastered(byId.get(n.id)));
    return { k, total: all.length, own: own.length, mas: mas.length };
  }).filter((r) => r.total);

  el.innerHTML = `<div class="page progress enter">${topBar(t('prog.title'))}
    <p class="hint center">${esc(t('prog.course', { lang: langName(course.target) }))}</p>
    <div class="kpis">
      <div><b>${mastered}</b><small>${esc(t('stats.mastered'))}</small></div>
      <div><b>${cards.length}</b><small>${esc(t('stats.cards'))}</small></div>
      <div><b>${streakOf(course)}</b><small>${esc(t('stats.streak'))}</small></div>
      <div><b>${last30}</b><small>${esc(t('prog.answers30'))}</small></div>
    </div>
    <div class="set-label">${esc(t('prog.curve'))}</div>
    <div class="panel">${lineChart(curve, [fmt(days[0]), fmt(days[days.length - 1])])}<p class="hint small">${esc(t('prog.curveHint'))}</p></div>
    <div class="set-label">${esc(t('prog.calendar'))}</div>
    <div class="panel"><div class="cal">${cells.join('')}</div>
      <div class="cal-legend"><span>${esc(t('prog.less'))}</span>${[0, 1, 2, 3, 4].map((c) => `<i class="c${c}"></i>`).join('')}<span>${esc(t('prog.more'))}</span></div></div>
    <div class="set-label">${esc(t('prog.levels'))}</div>
    <div class="panel levels-bars">${rows.map((r) => `<div class="lvl-row"><b>${esc(name(r.k))}</b>
      <span class="bar"><span class="own" style="width:${(r.own / r.total) * 100}%"></span><span class="mas" style="width:${(r.mas / r.total) * 100}%"></span></span>
      <small>${esc(t('prog.levelLine', { m: r.mas, o: r.own, n: r.total }))}</small></div>`).join('')}
      <div class="cal-legend"><i class="own"></i><span>${esc(t('prog.owned'))}</span><i class="mas"></i><span>${esc(t('stats.mastered'))}</span></div></div>
  </div>`;
}
