// ממשק: רינדור סצנות וקרבות, הסברי סיכון, נשקייה, פאנל דמות, שמירה וגלריית סופים.

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

function f(t) {
  return esc(fmt(state, t));
}

// שמירות ישנות — להשלים שדות חדשים
function migrate(s) {
  s.gear = s.gear || { weapon: 'club', armor: null, trinket: null };
  s.owned = s.owned || ['club'];
  s.inv = s.inv || { potion: 0, smoke: 0, net: 0 };
  if (s.flags && s.flags.potion && !s.flags.potionMigrated) { s.inv.potion++; s.flags.potionMigrated = true; }
  if (s.battle === undefined) s.battle = null;
  return s;
}

// ---------- פתיחה ----------

function canContinue(entry) {
  if (!entry || !SCENES[entry.state.scene]) return false;
  const sc = SCENES[entry.state.scene];
  return !sc.ending || sc.teaser;
}

function showStart() {
  $('game').hidden = true;
  $('start').hidden = false;
  document.body.classList.remove('moon3', 'panel-open');
  const db = readDB();
  const auto = db.auto;
  $('continue-btn').hidden = !canContinue(auto);
  if (auto) $('continue-btn').textContent = `להמשיך את המשחק של ${auto.meta.name} · ${auto.meta.chapter} (${timeAgo(auto.time)})`;
  const warn = $('storage-warn-start');
  warn.hidden = storageOK;
  warn.textContent = STORAGE_WARNING;
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

const STORAGE_WARNING = '⚠️ הדפדפן הזה חוסם שמירה (למשל: דפדפן בתוך וואטסאפ/אינסטגרם, או גלישה בסתר). ההתקדמות תישמר רק עד שתסגור את הדף. כדי לא לאבד אותה — פתח את המשחק בכרום/ספארי רגיל, או שמור "קוד שמירה" בחלון 💾.';

$('continue-btn').addEventListener('click', () => {
  const entry = readDB().auto;
  if (!entry) return;
  loadGame(loadEntry(entry));
});

function loadGame(st) {
  state = migrate(st);
  if ($('saves').open) $('saves').close();
  startGame();
}

$('restart-btn').addEventListener('click', () => {
  const sc = SCENES[state.scene];
  if (sc.ending || confirm('לחזור למסך הפתיחה? המשחק הנוכחי שמור — אפשר להמשיך אותו, או לטעון נקודת שמירה בחלון 💾.')) {
    probeStorage();
showStart();
  }
});

$('saves-btn').addEventListener('click', openSaves);
$('save-indicator').addEventListener('click', () => { if (!storageOK) openSaves(); });
$('saves-start-btn').addEventListener('click', openSaves);
$('saves-close').addEventListener('click', () => $('saves').close());

$('toggle-panel').addEventListener('click', () => document.body.classList.toggle('panel-open'));
$('shop-btn').addEventListener('click', openShop);
$('shop-close').addEventListener('click', () => $('shop').close());

function startGame() {
  $('start').hidden = true;
  $('game').hidden = false;
  render();
}

// ---------- רינדור ראשי ----------

function render(keepScroll) {
  const story = document.querySelector('.story');
  story.classList.remove('fade');
  void story.offsetWidth;
  story.classList.add('fade');
  const cur = SCENES[state.scene];
  story.classList.toggle('dark', !state.battle && !!(cur.dark || (cur.darkIf && cur.darkIf(state))));
  document.body.classList.toggle('moon3', state.season >= 3);

  const inBattle = !!state.battle;
  $('scene-view').hidden = inBattle;
  $('battle-view').hidden = !inBattle;
  if (inBattle) renderBattle();
  else renderScene();

  const sc = SCENES[state.scene];
  $('shop-btn').disabled = inBattle || !!sc.ending;
  renderPanel();
  persist();
  if (!keepScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderScene() {
  const sc = SCENES[state.scene];
  const chapter = typeof sc.chapter === 'function' ? sc.chapter(state) : sc.chapter;
  $('chapter').textContent = sc.ending ? 'סוף' : chapter || '';

  renderRoll();
  renderLastBattle();
  $('notes').innerHTML = state.notes.map((n) => `<span class="chip ${n.kind}">${f(n.text)}</span>`).join('');
  $('scene-title').textContent = fmt(state, sc.title);
  $('scene-text').innerHTML = sceneText(state, sc)
    .split(/\n\n+/)
    .map((p) => {
      const t = p.trim();
      const cls = t.startsWith('"') ? 'quote' : t.startsWith('—') ? 'rules' : p.includes('\n') ? 'list' : '';
      return `<p class="${cls}">${esc(t)}</p>`;
    })
    .join('');

  const box = $('choices');
  box.innerHTML = '';
  if (sc.ending) {
    renderEnding(sc, box);
  } else {
    visibleChoices(state, sc).forEach((c) => box.appendChild(choiceBlock(c)));
  }
}

function renderLastBattle() {
  const lb = state.lastBattle;
  const el = $('last-battle');
  if (!lb || state.lastRoll) { el.hidden = true; return; }
  el.hidden = false;
  el.className = 'roll ' + (lb.won ? 'ok' : 'bad');
  el.innerHTML = `<span class="verdict">${lb.won ? 'ניצחון' : lb.why === 'surrender' ? 'כניעה' : 'הפסד'}</span><span>מול ${esc(lb.enemy)}</span>${lb.gold ? `<span class="math">🪙 הרווחת ${lb.gold} זהב</span>` : ''}`;
  state.lastBattle = null;
}

// ---------- בחירות והסברי סיכון ----------

function outcomeLine(o) {
  const notes = o.notes.map((n) => fmt(state, n.text));
  const where = o.scene ? `→ "${fmt(state, o.scene.title)}"` : '';
  return `${notes.length ? esc(notes.join(' · ')) : 'בלי שינוי במספרים'} <span class="muted">${esc(where)}</span>`;
}

function deathWarning(o) {
  if (o.hp > 0) return '';
  const saved = inTeam(state, 'noa') && !has(state, 'noaSaved');
  return `<div class="warn">⚠️ ${saved ? 'החיים שלך יגיעו ל־0. נועה תציל אותך — אבל רק פעם אחת בכל המשחק.' : 'סכנת מוות: החיים שלך יגיעו ל־0, וזה סוף המשחק.'}</div>`;
}

function checkInfo(c) {
  const b = checkBreakdown(state, c.check);
  const need = Math.max(2, b.need);
  const parts = b.parts.map((p) => `${esc(p.label)} ${p.v}`).join(' + ');
  let needText;
  if (b.need <= 2) needText = 'הצלחה מובטחת — כל הטלה מספיקה.';
  else if (b.need > 12) needText = 'בלתי אפשרי כרגע — גם 12 לא יספיק.';
  else needText = `צריך להטיל <b>${need} ומעלה</b> בשתי קוביות.`;
  const ok = previewOutcome(state, c, true);
  const bad = previewOutcome(state, c, false);
  return `
    <div class="info-row"><span class="k">איך זה נקבע</span><span>🎲🎲 (2–12) + ${parts} = קוביות + ${b.base}. היעד: <b>${b.dc}</b>. ${needText}</span></div>
    <div class="info-row"><span class="k">סיכוי</span><span>${oddsBar(b.pct)}</span></div>
    <div class="info-row ok"><span class="k">✔ בהצלחה</span><span>${outcomeLine(ok)}</span></div>
    <div class="info-row bad"><span class="k">✖ בכישלון</span><span>${outcomeLine(bad)}</span></div>
    ${deathWarning(bad)}
    ${b.pct < 100 ? `<div class="tip">${tipFor(b)}</div>` : ''}`;
}

function tipFor(b) {
  const statName = STAT_NAMES[b.statKey];
  return `כל נקודה ב${statName} מעלה את הסיכוי בערך ב־${Math.max(3, Math.round(oddsGain(b.need)))}%.`;
}

function oddsGain(need) {
  return pct2d6(need - 1) - pct2d6(need);
}

function oddsBar(p) {
  const cls = p >= 70 ? 'good' : p >= 40 ? 'mid' : 'low';
  return `<span class="odds ${cls}"><span style="width:${p}%"></span></span> <b>${p}%</b> ${p >= 70 ? 'סיכון נמוך' : p >= 40 ? 'סיכון בינוני' : 'סיכון גבוה'}`;
}

function battleEstimate(c) {
  const mods = c.mods ? c.mods(state) : null;
  const tmp = cloneState(state);
  tmp.notes = [];
  if (c.effect) c.effect(tmp);
  return { est: estimateBattle(tmp, c.battle, mods, 300), tmp, mods };
}

function battleInfo(c, est, tmp, mods) {
  const e = ENEMIES[c.battle];
  const ab = ABILITIES[e.ability];
  const hp = e.hp + ((mods && mods.hp) || 0);
  const atk = e.atk + ((mods && mods.atk) || 0);
  const def = e.def + ((mods && mods.def) || 0);
  const myHit = pct2d6(def - pAttackBonus(tmp));
  const hisHit = pct2d6(pDefense(tmp, null, false) - atk);
  const ok = previewOutcome(state, c, true);
  const bad = previewOutcome(state, c, false);
  const deadly = state.season >= 2;
  return `
    <div class="enemy-mini">
      <b>${esc(e.name)}</b> <span class="muted">${esc(e.desc)}</span>
      <div class="stat-row"><span>❤ ${hp}</span><span>⚔️ התקפה ${atk}</span><span>🛡️ הגנה ${def}</span><span>💥 נזק ${e.dmg + ((mods && mods.dmg) || 0)}</span>${e.solo ? '<span>👤 דו־קרב — בלי הקבוצה</span>' : ''}</div>
      <div class="ability">✦ ${esc(ab.name)}: ${esc(ab.desc)}</div>
    </div>
    ${mods && mods.label ? `<div class="info-row ok"><span class="k">יתרון</span><span>${f(mods.label)}</span></div>` : ''}
    <div class="info-row"><span class="k">המספרים שלך</span><span>סיכוי שהנשק שלך יפגע: <b>${myHit}%</b> · סיכוי שהוא יפגע בך: <b>${hisHit}%</b>${e.solo ? '' : ` · הקבוצה (${teamCount(tmp)}) מוסיפה ${teamCount(tmp)} נזק בכל תור`}</span></div>
    <div class="info-row"><span class="k">הערכה</span><span>${oddsBar(est.win)}<br><span class="muted">לפי 300 קרבות מדומים של שחקן זהיר. ממוצע זהב: ${est.gold}${est.win ? ` · חיים שנשארים בניצחון: ~${est.hpLeft}` : ''}</span></span></div>
    <div class="info-row ok"><span class="k">✔ בניצחון</span><span>${outcomeLine(ok)} · זהב לפי ההשפעה שלך</span></div>
    <div class="info-row bad"><span class="k">✖ בהפסד</span><span>${outcomeLine(bad)}</span></div>
    <div class="${deadly ? 'warn' : 'tip'}">${deadly ? '⚠️ ליגת הדם: אם החיים שלך יגיעו ל־0 בלי שנכנעת — {אתה עלול|את עלולה} למות. אפשר להיכנע בכל תור.' : 'בעונה הזאת הפסד לא הורג: אם {תיפול|תיפלי}, יגררו אותך מהזירה עם 1 חיים.'}</div>`;
}

function choiceBlock(c) {
  const wrap = document.createElement('div');
  wrap.className = 'choice-wrap';
  const btn = document.createElement('button');
  btn.className = 'choice';
  const ok = isAvailable(state, c);
  let tag = '';
  let info = '';
  if (!ok) {
    tag = c.reqText || 'לא זמין';
  } else if (c.check) {
    const key = c.check.stat === 'main' ? mainStat(state) : c.check.stat;
    tag = `🎲 ${STAT_NAMES[key]} · ${checkOdds(state, c.check)}%`;
    info = checkInfo(c);
  } else if (c.battle) {
    const { est, tmp, mods } = battleEstimate(c);
    tag = `⚔️ קרב · ~${est.win}%`;
    info = battleInfo(c, est, tmp, mods);
  }
  btn.innerHTML = `<span class="arrow">‹</span><span class="label">${f(c.text)}</span>${tag ? `<span class="tag">${esc(tag)}</span>` : ''}`;
  btn.disabled = !ok;
  btn.addEventListener('click', () => {
    choose(state, c);
    document.body.classList.remove('panel-open');
    render();
  });
  wrap.appendChild(btn);
  if (info) {
    const t = document.createElement('button');
    t.className = 'info-toggle';
    t.type = 'button';
    t.textContent = '📊 פירוט הסיכון';
    t.setAttribute('aria-expanded', 'false');
    const panel = document.createElement('div');
    panel.className = 'info';
    panel.hidden = true;
    panel.innerHTML = fmt(state, info);
    t.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      t.setAttribute('aria-expanded', String(!panel.hidden));
      t.textContent = panel.hidden ? '📊 פירוט הסיכון' : 'להסתיר פירוט';
    });
    wrap.appendChild(t);
    wrap.appendChild(panel);
  }
  return wrap;
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
  if (r.extra) parts.push(`נסיבות ${r.extra}`);
  el.hidden = false;
  el.className = 'roll ' + (r.success ? 'ok' : 'bad');
  el.innerHTML = `
    <div class="dice"><span class="die">${r.d1}</span><span class="die">${r.d2}</span></div>
    <span class="verdict">${r.success ? 'הצלחה!' : 'כישלון'}</span>
    <span>${esc(r.label)}</span>
    <span class="math">${esc(parts.join(' + '))} = <b>${r.total}</b> מול ${r.dc}${r.success ? ` (עודף ${r.total - r.dc})` : ` (חסרו ${r.dc - r.total})`}</span>`;
}

// ---------- קרב ----------

function hpBar(cur, max, cls) {
  return `<div class="bar ${cls || ''}"><div class="bar-fill" style="width:${Math.round((Math.max(0, cur) / max) * 100)}%"></div><span>❤ ${Math.max(0, cur)} / ${max}</span></div>`;
}

function renderBattle() {
  const s = state;
  const b = s.battle;
  const e = b.e;
  const ab = ABILITIES[e.ability];
  $('chapter').textContent = `קרב · ${e.name}`;

  const status = [];
  if (b.airborne > 0) status.push('🪽 באוויר');
  if (b.stoneSkin > 0) status.push('🪨 עור אבן');
  if (b.transformed) status.push('🐻 בצורת חיה');
  if (b.stun > 0) status.push('💫 המום');
  if (b.eDefMod) status.push(`הגנה ${b.eDefMod > 0 ? '+' : ''}${b.eDefMod}`);
  const myStatus = [];
  if (b.pDefMod) myStatus.push(`🪨 הגנה +${b.pDefMod}`);
  if (b.block) myStatus.push('🧱 חסימה מוכנה');
  if (b.smoke) myStatus.push('💨 עשן');
  if (b.shadowed) myStatus.push('🌑 בצל');
  if (b.shielded) myStatus.push('✨ חומת אור');

  const w = weapon(s);
  const armor = gearItem(s, 'armor');
  const html = [];
  html.push(`<div class="battle-head"><h2 class="scene-title">⚔️ ${esc(e.name)}</h2><span class="round">תור ${Math.min(b.round, b.maxRounds)} / ${b.maxRounds}</span></div>`);
  if (b.deadly) html.push('<div class="warn slim">ליגת הדם: נפילה בלי כניעה עלולה להיות קטלנית.</div>');
  html.push(`<div class="fighters">
    <div class="fighter you">
      <div class="f-name">${esc(s.name)}</div>
      ${hpBar(s.hp, s.maxHp)}
      <div class="stat-row"><span>⚔️ ${esc(w.name)} +${pAttackBonus(s)}</span><span>🛡️ הגנה ${pDefense(s, b, false)}${armor ? ` · סופג ${armor.soak}` : ''}</span>${s.power ? `<span>${POWERS[s.power].icon} מטענים ${b.charges}</span>` : ''}</div>
      ${myStatus.length ? `<div class="status">${myStatus.join(' · ')}</div>` : ''}
    </div>
    <div class="vs">VS</div>
    <div class="fighter enemy">
      <div class="f-name">${esc(e.name)}</div>
      ${hpBar(e.hp, e.maxHp, 'enemy')}
      <div class="stat-row"><span>⚔️ ${e.atk}</span><span>🛡️ ${enemyDef(b)}</span><span>💥 ${e.dmg}</span></div>
      <div class="ability" title="${esc(ab.desc)}">✦ ${esc(ab.name)}</div>
      ${status.length ? `<div class="status">${status.join(' · ')}</div>` : ''}
    </div>
  </div>`);
  if (!b.solo && teamCount(s)) {
    const act = activeAllies(s, b);
    const who = teamIds(s).map((id) => {
      const w = b.wounds[id] || 0;
      if (b.fallen.includes(id)) return `<span class="ally-fallen">☠️ ${esc(COMPANIONS[id].name)}</span>`;
      if (b.out.includes(id)) return `<span class="ally-out">🩸 ${esc(COMPANIONS[id].name)}</span>`;
      return `<span class="${w ? 'ally-hurt' : ''}">${esc(COMPANIONS[id].name)}${w ? ' 💢' : ''}</span>`;
    }).join(' · ');
    html.push(`<div class="team-strip">👥 ${who} — ${act.length} נזק אוטומטי בכל תור${b.airborne > 0 ? ' (חצי כשהיריב באוויר)' : ''}</div>`);
  } else if (b.solo) {
    html.push('<div class="team-strip">👤 דו־קרב: הקבוצה צופה מהגדר.</div>');
  }

  if (b.over) {
    html.push(battleSummary(b));
  } else {
    const it = intentInfo(s, b);
    html.push(`<div class="intent"><span class="i-icon">${it.icon}</span><div><div class="k">מה ${esc(e.name)} עומד לעשות</div>${f(it.text)}</div></div>`);
    html.push('<div class="actions" id="actions"></div>');
    html.push(`<details class="rules"><summary>איך נקבע ניצחון או הפסד?</summary>
      <ul>
        <li><b>פגיעה:</b> שתי קוביות + התכונה של הנשק + בונוס הנשק. אם הסכום מגיע להגנה של היריב — פגעת. כל 2 נקודות מעל ההגנה מוסיפות 1 נזק.</li>
        <li><b>ההגנה שלך:</b> 8 + זריזות + שריון. היריב מטיל שתי קוביות + ההתקפה שלו מולה. השריון סופג חלק מהנזק.</li>
        <li><b>התגוננות:</b> +4 הגנה בתור הזה, הנזק שמגיע אליך נחצה, ואם הוא מחטיא — מכת נגד של 2.</li>
        <li><b>הקבוצה:</b> כל חבר בקבוצה מוסיף 1 נזק אוטומטי בכל תור. פקודה לחבר מפעילה את היכולת המיוחדת שלו (פעם בקרב), במקום התור שלך.</li>
        <li><b>להגן על החברים:</b> מכה כבדה, צלילה, מטח או רעידת אדמה עלולות לפגוע באחד החברים — אלא אם התגוננת באותו תור, או שבורג חסם. פצע ראשון: 💢. פצע שני: החבר מחוץ לקרב. <b>בליגת הדם (עונה 2 ו־3), פצע שני הוא מוות — לתמיד.</b> נועה יכולה לנקות פצעים.</li>
        <li><b>ניצחון:</b> החיים של היריב מגיעים ל־0. <b>הפסד:</b> החיים שלך מגיעים ל־0, או שנכנעת.</li>
        <li><b>אחרי ${b.maxRounds} תורות:</b> השופטים מכריעים — מי שנשאר לו אחוז חיים גבוה יותר, מנצח.</li>
        <li><b>זהב:</b> 30% מהפרס על עצם הניצחון, ו־70% לפי ההשפעה שלך: הנזק שלך + 2 על כל הגנה על הקבוצה + 1 על כל פקודה, מתוך כל מה שנעשה בקרב. מכת הסיום שווה 2 בונוס. בהפסד מקבלים 25% מהפרס לפי ההשפעה. בכניעה — כלום.</li>
      </ul></details>`);
  }
  html.push(`<div class="blog">${battleLog(b)}</div>`);
  $('battle-view').innerHTML = html.join('');
  if (!b.over) renderActions();
  else $('battle-continue').addEventListener('click', () => { finishBattle(state); render(); });
}

function renderActions() {
  const s = state;
  const b = s.battle;
  const ai = actionInfo(s, b);
  const box = $('actions');
  const add = (label, sub, fn, disabled, cls) => {
    const el = document.createElement('button');
    el.className = 'act ' + (cls || '');
    el.disabled = !!disabled;
    el.innerHTML = `<span class="a-label">${f(label)}</span><span class="a-sub">${f(sub)}</span>`;
    el.addEventListener('click', () => { fn(); render(true); });
    box.appendChild(el);
  };
  const w = weapon(s);
  add(`⚔️ התקפה — ${w.name}`, `${ai.attack.pct}% לפגוע · ${ai.attack.dmg}+ נזק${b.airborne > 0 && !w.reach ? ' · 3− באוויר' : ''}${w.crit ? ' · קריטי בעודף 4+' : ''}`, () => battleAct(s, 'attack'));
  if (s.power) {
    add(`${POWERS[s.power].icon} ${POWERS[s.power].name}`, b.charges ? `${ai.power.pct}% לפגוע · ${ai.power.dmg}+ נזק · נשארו ${b.charges} מטענים · ${powerEffect(s.power)}` : 'אין מטענים', () => battleAct(s, 'power'), !b.charges, 'power');
  }
  add('🛡️ התגוננות', '+4 הגנה, חצי נזק, מכת נגד 2 אם הוא מחטיא', () => battleAct(s, 'defend'));
  if (!b.solo) {
    activeAllies(s, b).filter((id) => ALLY_SKILLS[id]).forEach((id) => {
      const used = b.used.includes(id);
      const sk = ALLY_SKILLS[id];
      add(`📣 ${COMPANIONS[id].name}: ${sk.name}`, used ? 'כבר נוצל בקרב הזה' : sk.desc + ' (במקום התור שלך)', () => battleAct(s, 'ally', id), used, 'ally');
    });
  }
  ['potion', 'smoke', 'net'].forEach((id) => {
    if (s.inv[id] > 0) add(`🎒 ${ITEMS[id].name} ×${s.inv[id]}`, ITEMS[id].desc.replace('בקרב: ', ''), () => battleAct(s, 'item', id), false, 'item');
  });
  add('🏳️ להיכנע', 'הקרב נגמר בהפסד, בלי זהב — אבל {אתה נשאר|את נשארת} עם החיים שיש לך', () => {
    if (confirm('להיכנע? הקרב ייחשב הפסד ולא {תקבל|תקבלי} זהב.'.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m, fm) => (state.gender === 'f' ? fm : m)))) battleAct(s, 'surrender');
  }, false, 'surrender');
}

function powerEffect(p) {
  return {
    fire: '+2 נזק',
    shadow: 'המכה הבאה שלו נגדך 3−',
    shield: 'הנזק הבא אליך נחצה',
    voice: 'בפגיעה — הוא מפסיד תור',
  }[p];
}

function battleLog(b) {
  const out = [];
  let group = [];
  const flush = () => { if (group.length) out.unshift(`<div class="lround">${group.join('')}</div>`); group = []; };
  b.log.forEach((l) => {
    if (l.t === 'round') { flush(); group.push(`<div class="lhead">${esc(l.text)}</div>`); return; }
    if (l.dice) {
      const who = l.t === 'you' ? 'את{ה|}' : 'היריב';
      group.push(`<div class="lline l-${l.t}"><span class="mini-dice">${l.dice.map((d) => `<i>${d}</i>`).join('')}</span><span>${l.t === 'you' ? '🎯 ' + f(who) : '🎯 ' + who}: ${esc(l.text)} — <b class="${l.hit ? (l.t === 'you' ? 'g' : 'r') : (l.t === 'you' ? 'r' : 'g')}">${l.hit ? 'פגיעה' : 'החטאה'}</b></span></div>`);
    } else {
      group.push(`<div class="lline l-${l.t}">${f(l.text)}</div>`);
    }
  });
  flush();
  return out.join('');
}

function battleSummary(b) {
  const o = b.over;
  const total = o.impact + o.tDmg;
  return `<div class="summary ${o.won ? 'ok' : 'bad'}">
    <div class="s-title">${o.won ? '🏆 ניצחון' : o.why === 'surrender' ? '🏳️ כניעה' : '💀 הפסד'}</div>
    <p>${f(o.reason)}</p>
    <table>
      <tr><td>תורות</td><td>${o.rounds}</td></tr>
      <tr><td>הנזק שלך</td><td>${o.pDmg}</td></tr>
      <tr><td>הגנה על הקבוצה</td><td>${o.protect} × 2 = ${o.protect * 2}</td></tr>
      <tr><td>פקודות לקבוצה</td><td>${o.commands}</td></tr>
      <tr><td>נזק של הקבוצה</td><td>${o.tDmg}</td></tr>
      <tr class="strong"><td>ההשפעה שלך</td><td>${o.impact} מתוך ${total} = ${Math.round(o.share * 100)}%</td></tr>
      ${o.lines.map((l) => `<tr><td colspan="2">🪙 ${esc(l)}</td></tr>`).join('')}
      <tr class="strong"><td>סה"כ זהב</td><td>🪙 ${o.gold}</td></tr>
    </table>
    ${b.fallen.length ? `<div class="warn dead">☠️ בקרב הזה נפלו: <b>${esc(names(b.fallen))}</b>. הם לא יחזרו.</div>` : ''}
    ${b.out.filter((id) => !b.fallen.includes(id)).length ? `<div class="tip">🩸 נפצעו קשה ויצאו מהקרב: ${esc(names(b.out.filter((id) => !b.fallen.includes(id))))}. הם יתאוששו.</div>` : ''}
    ${o.why === 'ko' ? `<div class="warn">${b.deadly ? 'ליגת הדם: {נפלת|נפלת} בלי להיכנע.' : 'יגררו אותך מהזירה עם 1 חיים.'}</div>` : ''}
    <button class="btn primary" id="battle-continue">המשך</button>
  </div>`.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m, fm) => (state.gender === 'f' ? fm : m));
}

// ---------- שמירה ----------

let indicatorTimer = null;

function persist() {
  const ok = autosave(state);
  const el = $('save-indicator');
  if (!el) return;
  el.className = 'save-indicator ' + (ok ? 'ok' : 'bad');
  el.textContent = ok ? '✔ נשמר' : '⚠️ לא נשמר';
  el.title = ok ? 'המשחק נשמר אוטומטית' : STORAGE_WARNING;
  clearTimeout(indicatorTimer);
  if (ok) indicatorTimer = setTimeout(() => { el.textContent = ''; }, 1600);
}

function entryCard(entry, actions) {
  const m = entry.meta;
  return `<div class="item save-entry">
    <div class="i-name">${esc(entry.label)} <span class="muted">· ${esc(timeAgo(entry.time))}</span></div>
    <div class="i-desc">${esc(m.name)} · ${esc(m.chapter)}<br>${esc(m.title)}</div>
    <div class="i-stats"><span>❤ ${m.hp}/${m.maxHp}</span><span>🪙 ${m.gold}</span><span>👥 ${m.team}</span><span>🌙 עונה ${Math.min(m.season, 3)}</span></div>
    <div class="i-buy">${actions}</div>
  </div>`;
}

function openSaves() {
  renderSaves();
  $('saves').showModal();
}

function renderSaves(msg) {
  const db = readDB();
  const inGame = !!state && !$('game').hidden;
  const html = [];
  if (!storageOK) html.push(`<div class="warn">${esc(STORAGE_WARNING)}</div>`);
  if (msg) html.push(`<div class="tip ok-msg">${esc(msg)}</div>`);
  html.push('<p class="muted">המשחק נשמר אוטומטית אחרי כל בחירה. בנוסף נשמרות נקודות שמירה בתחילת כל פרק ולפני כל קרב — כדי שאפשר יהיה לחזור אחורה ולנסות אחרת.</p>');

  html.push('<h3 class="sv-h">שמירה אוטומטית</h3>');
  html.push(db.auto ? `<div class="items">${entryCard(db.auto, `<button class="btn small" data-load="auto">טעינה</button>`)}</div>` : '<p class="muted">אין עדיין.</p>');

  html.push('<h3 class="sv-h">משבצות שמירה</h3><div class="items">');
  db.slots.forEach((e, i) => {
    const saveBtn = inGame ? `<button class="btn small ghost" data-save="${i}">${e ? 'לשמור כאן (דריסה)' : 'לשמור כאן'}</button>` : '';
    if (e) html.push(entryCard(e, `<button class="btn small" data-slot="${i}">טעינה</button>${saveBtn}<button class="btn small ghost" data-del="${i}">מחיקה</button>`));
    else html.push(`<div class="item save-entry empty"><div class="i-name">משבצת ${i + 1}</div><div class="i-desc">ריקה</div><div class="i-buy">${saveBtn || '<span class="muted">אפשר לשמור מתוך המשחק</span>'}</div></div>`);
  });
  html.push('</div>');

  html.push('<h3 class="sv-h">נקודות שמירה אוטומטיות</h3>');
  if (db.checkpoints.length) {
    html.push(`<div class="items">${db.checkpoints.map((e, i) => entryCard(e, `<button class="btn small" data-cp="${i}">לחזור לכאן</button>`)).join('')}</div>`);
  } else {
    html.push('<p class="muted">אין עדיין.</p>');
  }

  html.push('<h3 class="sv-h">קוד שמירה — להעברה למכשיר או דפדפן אחר</h3>');
  if (inGame) {
    html.push(`<div class="code-box"><textarea id="export-code" readonly rows="3">${esc(exportCode(state))}</textarea>
      <div class="i-buy"><button class="btn small" id="copy-code">📋 להעתיק קוד</button><button class="btn small ghost" id="download-code">⬇️ להוריד כקובץ</button></div></div>`);
  }
  html.push(`<div class="code-box"><textarea id="import-code" rows="3" placeholder="להדביק כאן קוד שמירה (מתחיל ב־ARENA1:)"></textarea>
    <div class="i-buy"><button class="btn small" id="import-btn">📥 לטעון מקוד</button><label class="btn small ghost file-btn">📂 לטעון מקובץ<input type="file" id="import-file" accept=".txt,text/plain" hidden></label></div>
    <div id="import-err" class="warn" hidden></div></div>`);

  $('saves-body').innerHTML = html.join('');
  const body = $('saves-body');
  const confirmLoad = () => !inGame || confirm('לטעון? ההתקדמות הנוכחית נשמרת בשמירה האוטומטית עד הבחירה הבאה.');
  body.querySelectorAll('[data-load]').forEach((el) => el.addEventListener('click', () => { if (confirmLoad()) loadGame(loadEntry(db.auto)); }));
  body.querySelectorAll('[data-slot]').forEach((el) => el.addEventListener('click', () => { if (confirmLoad()) loadGame(loadEntry(db.slots[+el.dataset.slot])); }));
  body.querySelectorAll('[data-cp]').forEach((el) => el.addEventListener('click', () => { if (confirmLoad()) loadGame(loadEntry(db.checkpoints[+el.dataset.cp])); }));
  body.querySelectorAll('[data-save]').forEach((el) => el.addEventListener('click', () => {
    const i = +el.dataset.save;
    if (db.slots[i] && !confirm(`לדרוס את משבצת ${i + 1}?`)) return;
    const ok = saveToSlot(state, i);
    renderSaves(ok ? `נשמר במשבצת ${i + 1}.` : 'השמירה נכשלה — הדפדפן חוסם שמירה. השתמש בקוד שמירה.');
  }));
  body.querySelectorAll('[data-del]').forEach((el) => el.addEventListener('click', () => {
    if (confirm(`למחוק את משבצת ${+el.dataset.del + 1}?`)) { deleteSlot(+el.dataset.del); renderSaves(); }
  }));
  const copy = $('copy-code');
  if (copy) copy.addEventListener('click', async () => {
    const ta = $('export-code');
    try { await navigator.clipboard.writeText(ta.value); } catch (e) { ta.select(); document.execCommand('copy'); }
    copy.textContent = '✔ הועתק';
  });
  const dl = $('download-code');
  if (dl) dl.addEventListener('click', () => {
    const blob = new Blob([$('export-code').value], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `arena-${state.name}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const showErr = (m) => { const e = $('import-err'); e.hidden = false; e.textContent = m; };
  $('import-btn').addEventListener('click', () => {
    try { loadGame(importCode($('import-code').value)); } catch (e) { showErr('הקוד לא תקין. ודא שהעתקת את כולו.'); }
  });
  $('import-file').addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    file.text().then((txt) => {
      try { loadGame(importCode(txt)); } catch (e) { showErr('הקובץ לא מכיל קוד שמירה תקין.'); }
    });
  });
}

// ---------- נשקייה ----------

let shopTab = 'weapon';

function openShop() {
  renderShop();
  $('shop').showModal();
}

function renderShop() {
  const s = state;
  const tabs = Object.entries(SLOT_NAMES)
    .map(([k, v]) => `<button class="tab ${k === shopTab ? 'on' : ''}" data-tab="${k}">${v}</button>`)
    .join('');
  const items = Object.entries(ITEMS).filter(([, it]) => it.slot === shopTab);
  const cards = items.map(([id, it]) => {
    const owned = s.owned.includes(id);
    const equipped = s.gear[it.slot] === id;
    const stats = [];
    if (it.slot === 'weapon') stats.push(`פגיעה: ${STAT_NAMES[it.stat]} ${it.atk >= 0 ? '+' : ''}${it.atk}`, `נזק ${it.dmg}`);
    if (it.def) stats.push(`הגנה +${it.def}`);
    if (it.soak) stats.push(`סופג ${it.soak}`);
    if (it.charge) stats.push(`+${it.charge} מטען כוח`);
    if (it.hp) stats.push(`+${it.hp} חיים`);
    if (it.dmg && it.slot === 'trinket') stats.push(`+${it.dmg} נזק`);
    let btn;
    if (it.slot === 'use') btn = `<button class="btn small" data-buy="${id}" ${s.gold < it.price ? 'disabled' : ''}>לקנות · 🪙 ${it.price}</button><span class="have">יש לך ${s.inv[id] || 0}</span>`;
    else if (equipped) btn = '<span class="equipped">✔ מצויד</span>';
    else if (owned) btn = `<button class="btn small ghost" data-equip="${id}">לצייד</button>`;
    else btn = `<button class="btn small" data-buy="${id}" ${s.gold < it.price ? 'disabled' : ''}>${it.price ? `לקנות · 🪙 ${it.price}` : 'חינם'}</button>`;
    return `<div class="item ${equipped ? 'on' : ''}">
      <div class="i-name">${esc(it.name)}</div>
      <div class="i-desc">${esc(it.desc)}</div>
      ${stats.length ? `<div class="i-stats">${stats.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
      <div class="i-buy">${btn}</div>
    </div>`;
  }).join('');
  $('shop-body').innerHTML = `
    <p class="muted">יש לך 🪙 <b>${s.gold}</b> זהב. זהב מרוויחים בקרבות — ככל שההשפעה שלך בקרב גדולה יותר, הפרס גדול יותר.</p>
    <div class="tabs">${tabs}</div>
    <div class="items">${cards}</div>`;
  $('shop-body').querySelectorAll('[data-tab]').forEach((el) => el.addEventListener('click', () => { shopTab = el.dataset.tab; renderShop(); }));
  $('shop-body').querySelectorAll('[data-buy]').forEach((el) => el.addEventListener('click', () => { buyItem(s, el.dataset.buy); afterShop(); }));
  $('shop-body').querySelectorAll('[data-equip]').forEach((el) => el.addEventListener('click', () => { equipItem(s, el.dataset.equip); afterShop(); }));
}

function afterShop() {
  renderShop();
  renderPanel();
  // הסיכויים בבחירות תלויים בציוד
  if (!state.battle) renderScene();
  persist();
}

// ---------- סוף ----------

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
      ${romanceEpilogue(state) ? `<div class="memorial romance">${f(romanceEpilogue(state))}</div>` : ''}
      ${memorial()}
      <button class="btn primary" id="again">לשחק שוב — ולבחור אחרת</button>
    </div>`;
  $('again').addEventListener('click', showStart);
}

function memorial() {
  const dead = fallenIds(state);
  if (!dead.length) return '<div class="memorial">אף אחד מהקבוצה שלך לא נפל. זה נדיר בארנה.</div>';
  return `<div class="memorial">🕯️ לזכרם: <b>${esc(names(dead))}</b></div>`;
}

// ---------- פאנל ----------

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

  const g = (slot) => gearItem(s, slot);
  const inv = ['potion', 'smoke', 'net'].filter((id) => s.inv[id]).map((id) => `${ITEMS[id].name} ×${s.inv[id]}`);
  $('gear').innerHTML = `
    <li><span class="k">נשק</span>${esc(weapon(s).name)}</li>
    <li><span class="k">שריון</span>${g('armor') ? esc(g('armor').name) : '<span class="muted">אין</span>'}</li>
    <li><span class="k">קמע</span>${g('trinket') ? esc(g('trinket').name) : '<span class="muted">אין</span>'}</li>
    <li><span class="k">תיק</span>${inv.length ? esc(inv.join(', ')) : '<span class="muted">ריק</span>'}</li>
    <li class="combat"><span>⚔️ פגיעה +${pAttackBonus(s)}</span><span>🛡️ הגנה ${pDefense(s, null, false)}</span>${s.power ? `<span>${POWERS[s.power].icon} ${maxCharges(s)} מטענים</span>` : ''}</li>`;
  const drink = $('drink-btn');
  drink.hidden = !s.inv.potion || !!s.battle || s.hp >= s.maxHp;
  drink.onclick = () => { drinkPotion(s); note(s, 'שתית שיקוי ריפוי', 'up'); renderPanel(); persist(); };

  $('crew').innerHTML = Object.keys(s.crew)
    .sort((a, b) => (s.crew[a].status === 'team' ? 0 : 1) - (s.crew[b].status === 'team' ? 0 : 1))
    .map((id) => {
      const c = s.crew[id];
      const info = COMPANIONS[id];
      const hearts = '♥'.repeat(Math.min(5, Math.ceil(c.trust / 2))) || '·';
      const sk = ALLY_SKILLS[id];
      return `<li class="${c.status}" title="${sk ? esc(sk.name + ': ' + sk.desc) : ''}">
        <span class="avatar">${info.name[0]}</span>
        <span class="who">${c.status === 'dead' ? '🕯️ ' : ''}${info.name}<small>${c.status === 'team' ? info.role + (sk ? ' · ' + sk.name : '') : c.status === 'dead' ? (info.f ? 'נפלה' : 'נפל') : STATUS_NAMES[c.status]}</small></span>
        <span class="hearts" title="אמון ${c.trust}">${hearts}</span>
      </li>`;
    })
    .join('');
}

showStart();
