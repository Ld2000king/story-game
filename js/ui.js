// ממשק: רינדור סצנות, פאנל דמות, שמירה אוטומטית וגלריית סופים.

const SAVE_KEY = 'arena-save-v1';
const ENDINGS_KEY = 'arena-endings-v1';
const ALL_ENDINGS = Object.values(SCENES).filter((sc) => sc.ending && !sc.teaser);

const $ = (id) => document.getElementById(id);
let state = null;

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    return null;
  }
  return null;
}

function foundEndings() {
  return store(ENDINGS_KEY) || [];
}

function esc(t) {
  return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- פתיחה ----------

function showStart() {
  $('game').hidden = true;
  $('start').hidden = false;
  document.body.classList.remove('moon3', 'panel-open');
  const save = store(SAVE_KEY);
  $('continue-btn').hidden = !(save && SCENES[save.scene] && !SCENES[save.scene].ending);
  if (save) $('continue-btn').textContent = `להמשיך את המשחק של ${save.name}`;
  const n = foundEndings().length;
  $('endings-count').textContent = n ? `גילית ${n} מתוך ${ALL_ENDINGS.length} סופים` : `${ALL_ENDINGS.length} סופים שונים מחכים לך`;
}

$('start-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('player-name').value.trim() || 'לוחם';
  const gender = document.querySelector('input[name=gender]:checked').value;
  state = newState(name, gender);
  enterScene(state, 'p_class');
  startGame();
});

$('continue-btn').addEventListener('click', () => {
  const save = store(SAVE_KEY);
  if (!save) return;
  state = save;
  startGame();
});

$('restart-btn').addEventListener('click', () => {
  if (SCENES[state.scene].ending || confirm('להתחיל משחק חדש? ההתקדמות הנוכחית תימחק.')) {
    store(SAVE_KEY, null);
    showStart();
  }
});

$('toggle-panel').addEventListener('click', () => document.body.classList.toggle('panel-open'));

function startGame() {
  $('start').hidden = true;
  $('game').hidden = false;
  render();
}

// ---------- רינדור ----------

function render() {
  const sc = SCENES[state.scene];
  const story = document.querySelector('.story');
  story.classList.remove('fade');
  void story.offsetWidth;
  story.classList.add('fade');

  const chapter = typeof sc.chapter === 'function' ? sc.chapter(state) : sc.chapter;
  $('chapter').textContent = sc.ending ? 'סוף' : chapter || '';
  document.body.classList.toggle('moon3', state.season >= 3);

  renderRoll();
  $('notes').innerHTML = state.notes.map((n) => `<span class="chip ${n.kind}">${esc(fmt(state, n.text))}</span>`).join('');
  $('scene-title').textContent = fmt(state, sc.title);
  $('scene-text').innerHTML = sceneText(state, sc)
    .split(/\n\n+/)
    .map((p) => {
      const cls = p.trim().startsWith('"') ? 'quote' : p.includes('\n') ? 'list' : '';
      return `<p class="${cls}">${esc(p.trim())}</p>`;
    })
    .join('');

  const box = $('choices');
  box.innerHTML = '';
  if (sc.ending) {
    renderEnding(sc, box);
  } else {
    visibleChoices(state, sc).forEach((c) => box.appendChild(choiceButton(c)));
  }

  renderPanel();
  if (sc.ending) store(SAVE_KEY, null);
  else store(SAVE_KEY, state);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function choiceButton(c) {
  const b = document.createElement('button');
  b.className = 'choice';
  const ok = isAvailable(state, c);
  let tag = '';
  if (!ok) {
    tag = c.reqText || 'לא זמין';
  } else if (c.check) {
    const key = c.check.stat === 'main' ? mainStat(state) : c.check.stat;
    tag = `🎲 ${STAT_NAMES[key]} · ${checkOdds(state, c.check)}%`;
  }
  b.innerHTML = `<span class="arrow">‹</span><span class="label">${esc(fmt(state, c.text))}</span>${tag ? `<span class="tag">${esc(tag)}</span>` : ''}`;
  b.disabled = !ok;
  b.addEventListener('click', () => {
    choose(state, c);
    document.body.classList.remove('panel-open');
    render();
  });
  return b;
}

function renderRoll() {
  const r = state.lastRoll;
  const el = $('roll');
  if (!r) {
    el.hidden = true;
    return;
  }
  const parts = [`${r.d1}+${r.d2}`, `${STAT_NAMES[r.statKey]} ${r.statVal}`];
  if (r.powerB) parts.push(`כוח ${r.powerB}`);
  if (r.teamB) parts.push(`קבוצה ${r.teamB}`);
  if (r.extra) parts.push(`בונוס ${r.extra}`);
  el.hidden = false;
  el.className = 'roll ' + (r.success ? 'ok' : 'bad');
  el.innerHTML = `
    <div class="dice"><span class="die">${r.d1}</span><span class="die">${r.d2}</span></div>
    <span class="verdict">${r.success ? 'הצלחה!' : 'כישלון'}</span>
    <span>${esc(r.label)}</span>
    <span class="math">${esc(parts.join(' + '))} = <b>${r.total}</b> מול ${r.dc}</span>`;
}

function renderEnding(sc, box) {
  if (sc.teaser) {
    box.innerHTML = `
    <div class="ending-banner">
      <div class="label">סוף עונה 2</div>
      <div class="name">המשך יבוא</div>
      <div class="found">עונה 3 עדיין בכתיבה. בינתיים אפשר לחזור ולנסות מסלול אחר: משרת, בריחה, או להציל את החברים.</div>
      <button class="btn primary" id="again">לשחק שוב — ולבחור אחרת</button>
    </div>`;
    $('again').addEventListener('click', showStart);
    return;
  }
  const found = foundEndings();
  if (!found.includes(sc.id)) {
    found.push(sc.id);
    store(ENDINGS_KEY, found);
  }
  const list = ALL_ENDINGS.map((e) => `<span class="${found.includes(e.id) ? 'got' : ''}">${found.includes(e.id) ? esc(e.title) : '???'}</span>`).join('');
  box.innerHTML = `
    <div class="ending-banner">
      <div class="label">הגעת לסוף</div>
      <div class="name">${esc(sc.title)}</div>
      <div class="found">גילית ${found.length} מתוך ${ALL_ENDINGS.length} סופים</div>
      <div class="ending-list">${list}</div>
      <button class="btn primary" id="again">לשחק שוב — ולבחור אחרת</button>
    </div>`;
  $('again').addEventListener('click', showStart);
}

function renderPanel() {
  const s = state;
  $('hero-name').textContent = s.name;
  $('hero-power').textContent = s.power ? `${POWERS[s.power].icon} ${POWERS[s.power].name} · רמה ${s.powerLevel}` : 'הכוח שלך עוד לא התעורר';
  $('hero-power').title = s.power ? POWERS[s.power].desc : '';
  $('hp-bar').style.width = `${Math.round((s.hp / s.maxHp) * 100)}%`;
  $('hp-text').textContent = `❤ ${s.hp} / ${s.maxHp}`;
  $('gold').textContent = s.gold;
  $('fame').textContent = s.fame;
  $('season').textContent = Math.min(s.season, 3);

  const main = mainStat(s);
  $('stats').innerHTML = Object.keys(STAT_NAMES)
    .map((k) => {
      const v = s.stats[k];
      const pips = Array.from({ length: 8 }, (_, i) => `<span class="pip ${i < v ? (k === main && s.power ? 'main' : 'on') : ''}"></span>`).join('');
      return `<li><span>${STAT_NAMES[k]}</span><span class="pips">${pips}</span><b>${v}</b></li>`;
    })
    .join('');

  $('crew').innerHTML = Object.keys(s.crew)
    .sort((a, b) => (s.crew[a].status === 'team' ? 0 : 1) - (s.crew[b].status === 'team' ? 0 : 1))
    .map((id) => {
      const c = s.crew[id];
      const info = COMPANIONS[id];
      const hearts = '♥'.repeat(Math.min(5, Math.ceil(c.trust / 2))) || '·';
      return `<li class="${c.status}">
        <span class="avatar">${info.name[0]}</span>
        <span class="who">${info.name}<small>${c.status === 'team' ? info.role : STATUS_NAMES[c.status]}</small></span>
        <span class="hearts" title="אמון ${c.trust}">${hearts}</span>
      </li>`;
    })
    .join('');
}

showStart();
