// ליבת המשחק: מצב, עזרים, בדיקות קוביות ומעבר בין סצנות.
// הקובץ לא נוגע ב-DOM, כך שאפשר להריץ אותו גם ב-Node לבדיקות.

const STAT_NAMES = {
  power: 'כוח',
  agility: 'זריזות',
  spirit: 'רוח',
  influence: 'השפעה',
};

const POWERS = {
  fire: { name: 'להבת הזעם', stat: 'power', icon: '🔥', desc: 'אש שנולדת מכעס ומתעצמת כשהחברים שלך בסכנה.' },
  shadow: { name: 'הליכת צל', stat: 'agility', icon: '🌑', desc: 'היכולת להיבלע בצללים ולהופיע מאחורי האויב.' },
  shield: { name: 'חומת האור', stat: 'spirit', icon: '🛡️', desc: 'מחסום של אור טהור שמגן על כל מי שעומד מאחוריך.' },
  voice: { name: 'קול הפקודה', stat: 'influence', icon: '📯', desc: 'קול שחודר לנפש ומכריח אחרים לציית.' },
};

const COMPANIONS = {
  noa: { name: 'נועה', role: 'מרפאה', f: true },
  itay: { name: 'איתי', role: 'לוחם', f: false },
  maya: { name: 'מאיה', role: 'אסטרטגית', f: true },
  daniel: { name: 'דניאל', role: 'גנב צללים', f: false },
  kira: { name: 'קירה', role: 'לוחמת ילידת אורדן', f: true },
  borg: { name: 'בורג', role: 'ענק אבן', f: false },
  yoav: { name: 'יואב', role: 'כשף אדמה', f: false },
  alon: { name: 'אלון', role: 'הקצב האפור', f: false },
  ziv: { name: 'זיו', role: 'מהירות הברק', f: false },
  iris: { name: 'איריס', role: 'רוכבת הרוח — תעופה', f: true },
  rena: { name: 'רנה', role: 'משנת צורה', f: true },
  goren: { name: 'גורן', role: 'כשף אדמה', f: false },
};

const STATUS_NAMES = {
  team: 'בקבוצה',
  sold: 'נקנה ע"י ורקס',
  dead: 'נפל',
  gone: 'עזב',
};

// שלושת החברים שוורקס קונה בסוף העונה הראשונה
const BOUGHT = ['itay', 'maya', 'daniel'];

function newState(name, gender) {
  return {
    name: name || 'הלוחם',
    gender: gender === 'f' ? 'f' : 'm',
    stats: { power: 1, agility: 1, spirit: 1, influence: 1 },
    hp: 12,
    maxHp: 12,
    gold: 5,
    gear: { weapon: 'club', armor: null, trinket: null },
    owned: ['club'],
    inv: { potion: 0, smoke: 0, net: 0 },
    battle: null,
    lastBattle: null,
    fame: 0,
    power: null,
    powerLevel: 0,
    season: 1,
    path: 'arena',
    crew: {
      noa: { status: 'team', trust: 2 },
      itay: { status: 'team', trust: 2 },
      maya: { status: 'team', trust: 2 },
      daniel: { status: 'team', trust: 2 },
    },
    flags: {},
    scene: 'p_class',
    notes: [],
    lastRoll: null,
    steps: 0,
  };
}

// ---------- עזרים לסיפור ----------

function note(s, text, kind) {
  s.notes.push({ text, kind: kind || 'info' });
}

function signed(d) {
  return (d > 0 ? '+' : '') + d;
}

function addStat(s, k, d) {
  s.stats[k] = Math.max(0, s.stats[k] + d);
  note(s, `${signed(d)} ${STAT_NAMES[k]}`, d > 0 ? 'up' : 'down');
}

function addHp(s, d) {
  s.hp = Math.max(0, Math.min(s.maxHp, s.hp + d));
  note(s, `${signed(d)} חיים`, d > 0 ? 'up' : 'down');
}

function addMaxHp(s, d) {
  s.maxHp += d;
  s.hp += d;
  note(s, `${signed(d)} חיים מקסימליים`, 'up');
}

function healFull(s) {
  s.hp = s.maxHp;
  note(s, 'החיים התמלאו', 'up');
}

function addGold(s, d) {
  s.gold = Math.max(0, s.gold + d);
  note(s, `${signed(d)} זהב`, d > 0 ? 'up' : 'down');
}

function addFame(s, d) {
  s.fame = Math.max(0, s.fame + d);
  note(s, `${signed(d)} מוניטין`, d > 0 ? 'up' : 'down');
}

function addTrust(s, who, d) {
  const c = s.crew[who];
  if (!c || c.status === 'dead') return;
  c.trust = Math.max(0, Math.min(10, c.trust + d));
  note(s, `אמון ${COMPANIONS[who].name} ${signed(d)}`, d > 0 ? 'up' : 'down');
}

function trustTeam(s, d) {
  teamIds(s).forEach((id) => addTrust(s, id, d));
}

function setFlag(s, f, v) {
  s.flags[f] = v === undefined ? true : v;
}

function has(s, f) {
  return !!s.flags[f];
}

function trust(s, who) {
  return s.crew[who] ? s.crew[who].trust : 0;
}

function inTeam(s, who) {
  return !!s.crew[who] && s.crew[who].status === 'team';
}

function isSold(s, who) {
  return !!s.crew[who] && s.crew[who].status === 'sold';
}

function teamIds(s) {
  return Object.keys(s.crew).filter((id) => s.crew[id].status === 'team');
}

function soldIds(s) {
  return Object.keys(s.crew).filter((id) => s.crew[id].status === 'sold');
}

function teamCount(s) {
  return teamIds(s).length;
}

function names(ids) {
  const n = ids.map((id) => COMPANIONS[id].name);
  if (n.length === 0) return '';
  if (n.length === 1) return n[0];
  return n.slice(0, -1).join(', ') + ' ו' + n[n.length - 1];
}

function joinCrew(s, who, t) {
  if (s.crew[who]) {
    s.crew[who].status = 'team';
    if (t !== undefined) s.crew[who].trust = Math.max(s.crew[who].trust, t);
  } else {
    s.crew[who] = { status: 'team', trust: t === undefined ? 3 : t };
  }
  note(s, `${COMPANIONS[who].name} ${COMPANIONS[who].f ? 'הצטרפה' : 'הצטרף'} לקבוצה`, 'up');
}

function setStatus(s, who, status) {
  if (!s.crew[who]) return;
  s.crew[who].status = status;
  const n = COMPANIONS[who].name;
  const f = COMPANIONS[who].f;
  const msg = {
    sold: `${n} ${f ? 'עזבה' : 'עזב'} לבית ורקס`,
    dead: `${n} ${f ? 'נפלה' : 'נפל'}`,
    gone: `${n} ${f ? 'עזבה' : 'עזב'} את הקבוצה`,
    team: `${n} ${f ? 'חזרה' : 'חזר'} לקבוצה`,
  }[status];
  note(s, msg, status === 'team' ? 'up' : 'down');
}

function setPower(s, p) {
  s.power = p;
  s.powerLevel = 2;
  note(s, `${POWERS[p].icon} התעורר בך כוח: ${POWERS[p].name}`, 'power');
}

function powerUp(s, d) {
  if (!s.power) return;
  s.powerLevel += d || 1;
  note(s, `${POWERS[s.power].icon} ${POWERS[s.power].name} התחזקה — רמה ${s.powerLevel}`, 'power');
}

function mainStat(s) {
  return s.power ? POWERS[s.power].stat : 'power';
}

// מי מבין הנקנים הכי קרוב לשחקן
function closestSold(s) {
  const ids = soldIds(s);
  if (!ids.length) return null;
  return ids.reduce((a, b) => (trust(s, b) > trust(s, a) ? b : a));
}

// ---------- טקסט ----------

// {זכר|נקבה} לפי מגדר השחקן, $name לשם
function fmt(s, text) {
  return String(text)
    .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m, f) => (s.gender === 'f' ? f : m))
    .replace(/\$name/g, s.name);
}

// ---------- קוביות ----------

let rng = Math.random;
function setRng(fn) {
  rng = fn;
}

function d6() {
  return 1 + Math.floor(rng() * 6);
}

function teamBonus(s) {
  return teamCount(s);
}

function rollCheck(s, c) {
  const statKey = c.stat === 'main' ? mainStat(s) : c.stat;
  const d1 = d6();
  const d2 = d6();
  const statVal = s.stats[statKey];
  const powerB = s.power && POWERS[s.power].stat === statKey ? s.powerLevel : 0;
  const teamB = c.team ? teamBonus(s) : 0;
  const extra = c.bonus ? c.bonus(s) : 0;
  const total = d1 + d2 + statVal + powerB + teamB + extra;
  const success = total >= c.dc;
  s.lastRoll = { d1, d2, statKey, statVal, powerB, teamB, extra, total, dc: c.dc, success, label: c.label || '' };
  return success;
}

// סיכוי הצלחה משוער (לתצוגה בכפתור)
function checkOdds(s, c) {
  const statKey = c.stat === 'main' ? mainStat(s) : c.stat;
  const base =
    s.stats[statKey] +
    (s.power && POWERS[s.power].stat === statKey ? s.powerLevel : 0) +
    (c.team ? teamBonus(s) : 0) +
    (c.bonus ? c.bonus(s) : 0);
  let ok = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b + base >= c.dc) ok++;
  return Math.round((ok / 36) * 100);
}

// ---------- מנוע ----------

function sceneText(s, scene) {
  const t = typeof scene.text === 'function' ? scene.text(s) : scene.text;
  return fmt(s, t);
}

function visibleChoices(s, scene) {
  const list = typeof scene.choices === 'function' ? scene.choices(s) : scene.choices || [];
  return list.filter((c) => !c.show || c.show(s));
}

function isAvailable(s, c) {
  return !c.req || c.req(s);
}

function resolveNext(s, n) {
  return typeof n === 'function' ? n(s) : n;
}

function enterScene(s, id) {
  const scene = SCENES[id];
  if (!scene) throw new Error('סצנה חסרה: ' + id);
  s.scene = id;
  if (scene.enter) scene.enter(s);
  if (scene.redirect) {
    const r = scene.redirect(s);
    if (r) return enterScene(s, r);
  }
}

function choose(s, c) {
  s.notes = [];
  s.lastRoll = null;
  s.steps++;
  if (c.effect) c.effect(s);
  if (c.battle) {
    startBattle(s, c.battle, { win: c.win, lose: c.lose, mods: c.mods ? c.mods(s) : null });
    return;
  }
  let next;
  if (c.check) {
    const ok = rollCheck(s, c.check);
    if (ok) {
      if (c.onSuccess) c.onSuccess(s);
      next = resolveNext(s, c.success);
    } else {
      if (c.onFail) c.onFail(s);
      next = resolveNext(s, c.fail);
    }
  } else {
    next = resolveNext(s, c.next);
  }
  next = guardDeath(s, next);
  enterScene(s, next);
  // נזק שנגרם בכניסה לסצנה
  const after = guardDeath(s, s.scene);
  if (after !== s.scene) enterScene(s, after);
}

function guardDeath(s, next) {
  if (s.hp > 0 || (SCENES[next] && SCENES[next].ending)) return next;
  if (inTeam(s, 'noa') && !has(s, 'noaSaved')) {
    setFlag(s, 'noaSaved');
    s.hp = 5;
    note(s, 'נועה הצילה את חייך ברגע האחרון (פעם אחת בלבד)', 'power');
    return next;
  }
  return 'end_death';
}

// תצוגה מקדימה: מה יקרה אם הבחירה תצליח / תיכשל (מריץ על עותק של המצב)
function previewOutcome(s, c, ok) {
  const t = JSON.parse(JSON.stringify(s));
  t.notes = [];
  try {
    if (c.effect) c.effect(t);
    let next;
    if (c.check) {
      if (ok) { if (c.onSuccess) c.onSuccess(t); next = resolveNext(t, c.success); }
      else { if (c.onFail) c.onFail(t); next = resolveNext(t, c.fail); }
    } else if (c.battle) {
      next = resolveNext(t, ok ? c.win : c.lose);
    } else {
      next = resolveNext(t, c.next);
    }
    const sc = SCENES[next];
    if (sc && sc.enter) sc.enter(t);
    return { notes: t.notes, scene: sc, hp: t.hp };
  } catch (e) {
    return { notes: [], scene: null, hp: s.hp };
  }
}

// פירוק של בדיקת קוביות לחלקים, להסבר לשחקן
function checkBreakdown(s, c) {
  const statKey = c.stat === 'main' ? mainStat(s) : c.stat;
  const parts = [{ label: STAT_NAMES[statKey], v: s.stats[statKey] }];
  if (s.power && POWERS[s.power].stat === statKey) parts.push({ label: POWERS[s.power].name, v: s.powerLevel });
  if (c.team && teamBonus(s)) parts.push({ label: 'הקבוצה', v: teamBonus(s) });
  const extra = c.bonus ? c.bonus(s) : 0;
  if (extra) parts.push({ label: 'נסיבות', v: extra });
  const base = parts.reduce((n, p) => n + p.v, 0);
  const need = c.dc - base;
  return { statKey, parts, base, need, dc: c.dc, pct: checkOdds(s, c) };
}

const api = {
  STAT_NAMES, POWERS, COMPANIONS, STATUS_NAMES, BOUGHT,
  newState, note, addStat, addHp, addMaxHp, healFull, addGold, addFame, addTrust, trustTeam,
  setFlag, has, trust, inTeam, isSold, teamIds, soldIds, teamCount, names, joinCrew, setStatus,
  setPower, powerUp, mainStat, closestSold, fmt, setRng, rollCheck, checkOdds, teamBonus,
  sceneText, visibleChoices, isAvailable, choose, enterScene, resolveNext, guardDeath, previewOutcome, checkBreakdown, d6,
};
Object.assign(globalThis, api);
