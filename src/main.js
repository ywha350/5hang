import './style.css';
import { buildHanjaCards, buildRowCards, OHAENG, RAW } from './data.js';
import { saveRating, loadRatingsForMode, deleteRatingsForMode, clearAllRatings } from './db.js';

const HANJA_CARDS = buildHanjaCards();
const ROW_CARDS   = buildRowCards();

// ── STATE ─────────────────────────────────────────────────────────────────────
let S = {
  mode:    null,   // 'hanja' | 'row'
  deck:    [],
  idx:     0,
  ratings: {},     // session ratings: cardId → 'perfect'|'medium'|'fail'
  flipped: false,
  filter:  null,   // filter applied when starting ('perfect'|'medium'|'fail'|'unseen'|null)
};

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(n) {
  ['home','study','complete'].forEach(s =>
    document.getElementById('s-' + s).classList.toggle('hidden', s !== n)
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
document.getElementById('cnt-hanja').textContent = HANJA_CARDS.length + '장';
document.getElementById('cnt-row').textContent   = ROW_CARDS.length + '장';

async function refreshHomeStats() {
  for (const [mode, cards, filterId] of [
    ['hanja', HANJA_CARDS, 'filters-hanja'],
    ['row',   ROW_CARDS,   'filters-row'],
  ]) {
    const saved = await loadRatingsForMode(mode);
    const total = cards.length;
    const p = cards.filter(c => saved.get(c.id) === 'perfect').length;
    const m = cards.filter(c => saved.get(c.id) === 'medium').length;
    const f = cards.filter(c => saved.get(c.id) === 'fail').length;
    const u = total - p - m - f;

    const el = document.getElementById(filterId);
    const pills = [];

    pills.push(`<button class="filter-pill fp-all" onclick="startMode('${mode}', null)">전체 ${total}</button>`);
    if (p) pills.push(`<button class="filter-pill fp-perfect" onclick="startMode('${mode}', 'perfect')">완벽 ${p}</button>`);
    if (m) pills.push(`<button class="filter-pill fp-medium"  onclick="startMode('${mode}', 'medium')">중간 ${m}</button>`);
    if (f) pills.push(`<button class="filter-pill fp-fail"    onclick="startMode('${mode}', 'fail')">실패 ${f}</button>`);
    if (u && u < total) pills.push(`<button class="filter-pill fp-unseen"  onclick="startMode('${mode}', 'unseen')">미확인 ${u}</button>`);

    el.innerHTML = pills.join('');
  }
}

window.goHome = async function () {
  S = { mode: null, deck: [], idx: 0, ratings: {}, flipped: false, filter: null };
  await refreshHomeStats();
  showScreen('home');
};

window.resetAll = async function () {
  if (!confirm('모든 학습 기록을 초기화할까요?')) return;
  await clearAllRatings();
  await refreshHomeStats();
};

// ── START ─────────────────────────────────────────────────────────────────────
window.startMode = async function (mode, filter) {
  const base  = mode === 'hanja' ? HANJA_CARDS : ROW_CARDS;
  let cards   = base;

  if (filter) {
    const saved = await loadRatingsForMode(mode);
    if (filter === 'unseen') {
      cards = base.filter(c => !saved.has(c.id));
    } else {
      cards = base.filter(c => saved.get(c.id) === filter);
    }
    if (!cards.length) { alert('해당하는 카드가 없습니다.'); return; }
  }

  S.mode    = mode;
  S.filter  = filter;
  S.deck    = shuffle(cards);
  S.idx     = 0;
  S.ratings = {};
  S.flipped = false;

  const labels = { hanja: '한자 읽기', row: '행 암기' };
  const filterLabels = { perfect: '완벽', medium: '중간', fail: '실패', unseen: '미확인' };
  const sub = filter ? ` · ${filterLabels[filter]}` : '';
  document.getElementById('mode-label').textContent = labels[mode] + sub;

  showScreen('study');
  render();
};

// ── CARD RENDER ───────────────────────────────────────────────────────────────
function render() {
  const c  = S.deck[S.idx];
  const el = document.getElementById('card');
  S.flipped = false;
  el.style.cursor = 'pointer';
  el.onclick = flip;
  document.getElementById('rating').classList.add('hidden');

  if (c.type === 'hanja') {
    // Front: hanja only
    el.innerHTML = `<div class="card-big">${c.hanja}</div>`;
  } else {
    // Front: first item only
    el.innerHTML = `<div class="card-med">${c.items[0]}</div>`;
  }
  updateProg();
}

function renderBack() {
  const c  = S.deck[S.idx];
  const el = document.getElementById('card');

  if (c.type === 'hanja') {
    const row = RAW[c.rowIdx];
    const rowHTML = row.map((item, i) => `
      <div class="row-item ${i === c.colIdx ? 'hl' : ''}">
        <span class="row-ohaeng">${OHAENG[i]}</span>
        <span class="row-val">${item}</span>
      </div>`).join('');
    el.innerHTML = `
      <div class="card-big" style="font-size:52px;letter-spacing:-1.2px">${c.eum}</div>
      <span class="card-cat" style="margin-top:4px">${c.cat}</span>
      <div class="row-grid" style="margin-top:8px">${rowHTML}</div>`;
  } else {
    const rows = c.items.map((item, i) => `
      <div class="row-item ${i === 0 ? 'hl' : ''}">
        <span class="row-ohaeng">${OHAENG[i]}</span>
        <span class="row-val">${item}</span>
      </div>`).join('');
    el.innerHTML = `
      <span class="card-cat">${c.cat}</span>
      <div class="row-grid">${rows}</div>`;
  }
}

function flip() {
  if (S.flipped) return;
  S.flipped = true;
  const cw = document.getElementById('cw');
  cw.classList.add('fade');
  setTimeout(() => {
    renderBack();
    cw.classList.remove('fade');
    document.getElementById('card').style.cursor = 'default';
    document.getElementById('card').onclick = null;
    document.getElementById('rating').classList.remove('hidden');
  }, 150);
}
window.flip = flip;

window.rate = async function (r) {
  const card = S.deck[S.idx];
  S.ratings[card.id] = r;
  await saveRating(card.id, S.mode, r);

  S.idx++;
  if (S.idx >= S.deck.length) { showComplete(); return; }

  const cw = document.getElementById('cw');
  cw.classList.add('fade');
  setTimeout(() => { render(); cw.classList.remove('fade'); }, 120);
};

function updateProg() {
  const total = S.deck.length;
  const rv = Object.values(S.ratings);
  const p = rv.filter(r => r === 'perfect').length;
  const m = rv.filter(r => r === 'medium').length;
  const f = rv.filter(r => r === 'fail').length;
  const u = total - S.idx;
  document.getElementById('counter').textContent = `${S.idx + 1} / ${total}`;
  document.getElementById('badges').innerHTML = `
    <span class="badge b-perfect">완벽 ${p}</span>
    <span class="badge b-medium">중간 ${m}</span>
    <span class="badge b-fail">실패 ${f}</span>
    <span class="badge b-unseen">미확인 ${u}</span>`;
  document.getElementById('prog').style.width = (S.idx / total * 100) + '%';
}

// ── COMPLETE ──────────────────────────────────────────────────────────────────
function showComplete() {
  const rv = Object.values(S.ratings);
  const p  = rv.filter(r => r === 'perfect').length;
  const m  = rv.filter(r => r === 'medium').length;
  const f  = rv.filter(r => r === 'fail').length;
  document.getElementById('sn-p').textContent = p;
  document.getElementById('sn-m').textContent = m;
  document.getElementById('sn-f').textContent = f;
  document.getElementById('comp-sub').textContent = `총 ${S.deck.length}장 완료`;
  document.getElementById('btn-mf').classList.toggle('hidden', m + f === 0);
  document.getElementById('btn-f').classList.toggle('hidden',  f === 0);
  showScreen('complete');
}

window.restartAll = function () { startMode(S.mode, S.filter); };

window.retryF = function () {
  const ids  = new Set(Object.entries(S.ratings).filter(([,v]) => v === 'fail').map(([k]) => k));
  const base = S.mode === 'hanja' ? HANJA_CARDS : ROW_CARDS;
  const deck = shuffle(base.filter(c => ids.has(c.id)));
  S.deck = deck; S.idx = 0; S.ratings = {}; S.flipped = false;
  document.getElementById('mode-label').textContent =
    (S.mode === 'hanja' ? '한자 읽기' : '행 암기') + ' · 실패';
  showScreen('study');
  render();
};

window.retryMF = function () {
  const ids  = new Set(Object.entries(S.ratings).filter(([,v]) => v !== 'perfect').map(([k]) => k));
  const base = S.mode === 'hanja' ? HANJA_CARDS : ROW_CARDS;
  const deck = shuffle(base.filter(c => ids.has(c.id)));
  S.deck = deck; S.idx = 0; S.ratings = {}; S.flipped = false;
  document.getElementById('mode-label').textContent =
    (S.mode === 'hanja' ? '한자 읽기' : '행 암기') + ' · 중간+실패';
  showScreen('study');
  render();
};

// ── INIT ──────────────────────────────────────────────────────────────────────
refreshHomeStats();
