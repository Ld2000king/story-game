// מערכת הקרבות: ציוד, יריבים, יכולות, מהלך קרב בתורות, פרס לפי השפעה, והערכת סיכויים.
// הקובץ לא נוגע ב-DOM.

// ---------- ציוד ----------

const ITEMS = {
  club: { name: 'מקל אימונים', slot: 'weapon', price: 0, stat: 'power', atk: 0, dmg: 2, desc: 'מה שגרום נותן לכל טירון. עדיף מאגרוף, בקושי.' },
  spear: { name: 'חנית נחושת', slot: 'weapon', price: 10, stat: 'power', atk: 1, dmg: 3, reach: true, desc: 'טווח ארוך: פוגעת רגיל גם ביריבים שעפים באוויר.' },
  dagger: { name: 'פגיון צל', slot: 'weapon', price: 12, stat: 'agility', atk: 2, dmg: 2, crit: true, desc: 'מבוסס זריזות. פגיעה נקייה במיוחד (עודף 4+) גורמת נזק כפול.' },
  sword: { name: 'חרב פלדה', slot: 'weapon', price: 18, stat: 'power', atk: 2, dmg: 4, desc: 'מאוזנת: קל לפגוע, נזק טוב.' },
  staff: { name: 'מטה קריסטל', slot: 'weapon', price: 22, stat: 'spirit', atk: 1, dmg: 3, powerDmg: 2, charge: 1, desc: 'מבוסס רוח. הכוח שלך גורם +2 נזק, ומקבלים מטען כוח נוסף.' },
  whip: { name: 'שוט הפקודה', slot: 'weapon', price: 16, stat: 'influence', atk: 1, dmg: 3, desc: 'מבוסס השפעה. מי שיודע לפקד — יודע גם להכות.' },
  axe: { name: 'גרזן ענק', slot: 'weapon', price: 26, stat: 'power', atk: -1, dmg: 7, desc: 'קשה לפגוע איתו, אבל כל פגיעה מרסקת.' },

  leather: { name: 'שריון עור', slot: 'armor', price: 8, def: 1, soak: 1, desc: 'הגנה +1, סופג 1 נזק מכל מכה.' },
  cloak: { name: 'גלימת צללים', slot: 'armor', price: 14, def: 3, soak: 0, desc: 'הגנה +3: הרבה יותר קשה לפגוע בך. לא סופגת נזק.' },
  bronze: { name: 'שריון נחושת', slot: 'armor', price: 16, def: 2, soak: 2, desc: 'הגנה +2, סופג 2 נזק מכל מכה.' },
  scale: { name: 'שריון קשקשי זאב', slot: 'armor', price: 28, def: 3, soak: 3, desc: 'הגנה +3, סופג 3 נזק מכל מכה. הטוב ביותר בשוק.' },

  ring: { name: 'טבעת הדם', slot: 'trinket', price: 12, dmg: 1, desc: '+1 נזק לכל פגיעה שלך, בנשק או בכוח.' },
  amulet: { name: 'קמע הירח הכפול', slot: 'trinket', price: 15, charge: 1, desc: '+1 מטען כוח בכל קרב.' },
  heart: { name: 'לב של זאב חול', slot: 'trinket', price: 14, hp: 4, desc: '+4 חיים מקסימליים כל עוד הוא עליך.' },

  potion: { name: 'שיקוי ריפוי', slot: 'use', price: 6, desc: 'מרפא 6 חיים. בקרב זה מחליף את התור שלך.' },
  smoke: { name: 'פצצת עשן', slot: 'use', price: 5, desc: 'בקרב: ההתקפה הבאה של היריב מחטיאה בוודאות.' },
  net: { name: 'רשת ציד', slot: 'use', price: 7, desc: 'בקרב: היריב מפסיד את התור הבא, ומי שעף נופל לקרקע.' },
};

const SLOT_NAMES = { weapon: 'נשק', armor: 'שריון', trinket: 'קמע', use: 'מתכלה' };

function gearItem(s, slot) {
  const id = s.gear[slot];
  return id ? ITEMS[id] : null;
}

function weapon(s) {
  return gearItem(s, 'weapon') || ITEMS.club;
}

function trinketDmg(s) {
  return (gearItem(s, 'trinket') || {}).dmg || 0;
}

function gearSum(s, key) {
  return ['weapon', 'armor', 'trinket'].reduce((n, sl) => n + ((gearItem(s, sl) || {})[key] || 0), 0);
}

function buyItem(s, id) {
  const it = ITEMS[id];
  if (!it || s.gold < it.price) return false;
  s.gold -= it.price;
  if (it.slot === 'use') {
    s.inv[id] = (s.inv[id] || 0) + 1;
  } else {
    if (!s.owned.includes(id)) s.owned.push(id);
    equipItem(s, id);
  }
  return true;
}

function equipItem(s, id) {
  const it = ITEMS[id];
  if (!it || !s.owned.includes(id)) return;
  const old = gearItem(s, it.slot);
  if (old && old.hp) { s.maxHp -= old.hp; s.hp = Math.min(s.hp, s.maxHp); }
  s.gear[it.slot] = id;
  if (it.hp) { s.maxHp += it.hp; s.hp += it.hp; }
}

function drinkPotion(s) {
  if (!s.inv.potion) return false;
  s.inv.potion--;
  s.hp = Math.min(s.maxHp, s.hp + 6);
  return true;
}

// ---------- מאפייני קרב של השחקן ----------

function pAttackBonus(s) {
  const w = weapon(s);
  return s.stats[w.stat] + w.atk;
}

function pPowerBonus(s) {
  return s.stats[mainStat(s)] + s.powerLevel;
}

function pDefense(s, b, defending) {
  const armor = gearItem(s, 'armor');
  return 8 + s.stats.agility + (armor ? armor.def : 0) + (b ? b.pDefMod : 0) + (defending ? 4 : 0);
}

function pSoak(s) {
  const armor = gearItem(s, 'armor');
  return armor ? armor.soak : 0;
}

function maxCharges(s) {
  if (!s.power) return 0;
  return 1 + Math.floor(s.powerLevel / 2) + gearSum(s, 'charge');
}

// ---------- יריבים ----------

const ABILITIES = {
  leap: { name: 'זינוק', desc: 'מדי פעם מזנק בהתקפה כבדה: נזק גבוה, אבל נחשף — קל יותר לפגוע בו באותו תור.' },
  earth: { name: 'כשף אדמה', desc: 'יכול לעטות עור אבן (+3 הגנה לשני תורות) או להרעיד את האדמה (3 נזק בטוח, והקבוצה שלך לא תוקפת באותו תור).' },
  shape: { name: 'שינוי צורה', desc: 'כשהוא נפצע מתחת ל־60%, הוא הופך לחיה: מרפא 8, ומכה חזק יותר עד סוף הקרב.' },
  flight: { name: 'תעופה', desc: 'ממריא לשני תורות. באוויר, נשק רגיל פוגע ב־3− (חוץ מחנית), הקבוצה פוגעת בחצי, והוא צולל עם מכה חזקה.' },
  speed: { name: 'מהירות', desc: 'מהיר מדי: חלק מההתקפות שלו הן מטח של שתי מכות.' },
  heavy: { name: 'כוח אדיר', desc: 'מכות כבדות לעיתים קרובות. כל אחת יכולה לשבור אותך.' },
  crystal: { name: 'לב הקריסטל', desc: 'שותה כוחות: הכוח שלך פוגע בו בחצי בלבד ומרפא אותו ב־2. לפעמים יונק ממך 3 חיים (בלי קשר לשריון) ומרפא את עצמו.' },
};

const ENEMIES = {
  sandwolf: { name: 'זאב החול', hp: 20, atk: 3, def: 9, dmg: 3, ability: 'leap', purse: 10, desc: 'חיה בגודל של סוס, עם קשקשים במקום פרווה.' },
  yoavteam: { name: 'יואב והזאבים', hp: 28, atk: 4, def: 10, dmg: 3, ability: 'earth', purse: 12, desc: 'חמישה בני כיתה. יואב גילה כוח של כשף אדמה.' },
  yoavduel: { name: 'יואב', hp: 18, atk: 3, def: 10, dmg: 3, ability: 'earth', purse: 12, solo: true, desc: 'דו־קרב אחד על אחד. בלי הקבוצות.' },
  varkasteam: { name: 'בית ורקס', hp: 32, atk: 4, def: 11, dmg: 4, ability: 'shape', purse: 22, desc: 'החברים לשעבר בשריון זהב, ובראשם סֶרֶן — שכיר חרב משנה צורה.' },
  iris: { name: 'איריס, רוכבת הרוח', hp: 26, atk: 5, def: 11, dmg: 4, ability: 'flight', purse: 16, desc: 'לוחמת עם כנפיים של נוצות נחושת, האלופה של בית הרוחות.' },
  grey: { name: 'הקצב האפור', hp: 22, atk: 4, def: 10, dmg: 5, ability: 'heavy', purse: 26, solo: true, desc: 'עשר עונות בלי הפסד. דו־קרב.' },
  assassins: { name: 'המתנקשים במסכות', hp: 28, atk: 5, def: 11, dmg: 4, ability: 'speed', purse: 18, desc: 'חמישה צללים עם סכינים, באמצע הלילה, בתוך הצריף.' },
  lastguard: { name: 'המשמר האחרון של ורקס', hp: 34, atk: 5, def: 11, dmg: 4, ability: 'shape', purse: 30, desc: 'סרן משנה הצורה ושכירי החרב הכי יקרים שכסף יכול לקנות.' },
  guardian: { name: 'שומר הלב', hp: 40, atk: 5, def: 12, dmg: 5, ability: 'crystal', purse: 50, desc: 'יצור קריסטל בגובה שלוש קומות, שפועם בקצב של הלב שמתחת לחול.' },
  goldchamp: { name: 'אלוף בית ורקס', hp: 26, atk: 4, def: 11, dmg: 4, ability: 'speed', purse: 32, desc: 'אבק זהב הפך אותו למהיר מכל אדם.' },
};

// יכולות של חברי הקבוצה — פעם אחת בכל קרב, במקום התור שלך
const ALLY_SKILLS = {
  noa: { name: 'אור מרפא', desc: 'מרפאה אותך ב־5 חיים ומנקה את הפצעים של כל הקבוצה.' },
  itay: { name: 'מכת חנית', desc: '5 נזק ליריב.' },
  maya: { name: 'לחשוף חולשה', desc: 'הגנת היריב 3− עד סוף הקרב.' },
  daniel: { name: 'הסחת דעת', desc: 'היריב מפסיד את התור הבא.' },
  kira: { name: 'חרבות תאומות', desc: '5 נזק ליריב.' },
  borg: { name: 'חומת אבן', desc: 'חוסם לגמרי את ההתקפה הבאה של היריב.' },
  yoav: { name: 'רעידת אדמה', desc: '3 נזק והגנת היריב 1−.' },
  alon: { name: 'מכת הקצב', desc: '7 נזק ליריב.' },
  ziv: { name: 'מטח ברק', desc: '4 נזק, פוגע גם באוויר, והיריב מאבד את התעופה.' },
  iris: { name: 'צלילה מהשמיים', desc: '4 נזק, מתעלמת מהגנה ומפילה יריב שעף.' },
  rena: { name: 'צורת דוב', desc: 'הופכת לדוב: 6 נזק ליריב.' },
  goren: { name: 'שריון אבן', desc: 'ההגנה שלך +3 עד סוף הקרב.' },
};

// ---------- מהלך הקרב ----------

// חברי קבוצה שעדיין עומדים בקרב הזה
function activeAllies(s, b) {
  return teamIds(s).filter((id) => !(b.out || []).includes(id));
}

const ALLY_FALL_TEXT = {
  hurt: (n, f) => `💢 ${n} ${f ? 'נפגעת' : 'נפגע'} מהמכה — פצע ראשון.`,
  out: (n, f) => `🩸 ${n} ${f ? 'נופלת' : 'נופל'} על החול ולא ${f ? 'קמה' : 'קם'}. מחוץ לקרב.`,
  dead: (n, f) => `☠️ ${n} ${f ? 'נופלת' : 'נופל'} על החול. הדם לא מפסיק. ${f ? 'היא' : 'הוא'} לא ${f ? 'קמה' : 'קם'} יותר.`,
};

// מכה חזקה שלא נחסמה עלולה לפגוע בחבר בקבוצה. שני פצעים — מחוץ לקרב. בליגת הדם — מוות.
function hurtAlly(s, b, chance) {
  if (b.solo) return;
  const allies = activeAllies(s, b);
  if (!allies.length || rng() >= chance) return;
  const id = allies[Math.floor(rng() * allies.length)];
  const n = COMPANIONS[id].name;
  const f = COMPANIONS[id].f;
  b.wounds[id] = (b.wounds[id] || 0) + 1;
  if (b.wounds[id] < 2) {
    b.log.push({ t: 'bad', text: ALLY_FALL_TEXT.hurt(n, f) });
    return;
  }
  b.out.push(id);
  if (b.deadly) {
    b.fallen.push(id);
    b.log.push({ t: 'dead', text: ALLY_FALL_TEXT.dead(n, f) });
  } else {
    b.log.push({ t: 'bad', text: ALLY_FALL_TEXT.out(n, f) });
  }
}

function startBattle(s, enemyId, opt) {
  const base = ENEMIES[enemyId];
  const mods = opt.mods || {};
  const e = { ...base, maxHp: base.hp };
  if (mods.atk) e.atk += mods.atk;
  if (mods.dmg) e.dmg += mods.dmg;
  if (mods.hp) { e.hp += mods.hp; e.maxHp += mods.hp; }
  s.battle = {
    enemyId,
    e,
    solo: !!base.solo,
    deadly: s.season >= 2,
    round: 1,
    maxRounds: 6,
    win: resolveNext(s, opt.win),
    lose: resolveNext(s, opt.lose),
    charges: maxCharges(s) + (mods.charges || 0),
    used: [],
    eDefMod: mods.def || 0,
    pDefMod: 0,
    stun: mods.stun || 0,
    smoke: false,
    block: false,
    shadowed: false,
    shielded: false,
    airborne: 0,
    stoneSkin: 0,
    transformed: false,
    pDmg: 0,
    tDmg: 0,
    protect: 0,
    commands: 0,
    finisher: false,
    log: [],
    wounds: {},
    out: [],
    fallen: [],
    over: null,
    mods: mods.label || '',
  };
  const b = s.battle;
  if (mods.label) b.log.push({ t: 'info', text: mods.label });
  b.intent = pickIntent(b);
}

function pickIntent(b) {
  const e = b.e;
  const r = rng();
  if (b.stun > 0) return 'stunned';
  if (e.ability === 'flight') {
    if (b.airborne > 0) return 'dive';
    if (r < 0.35) return 'takeoff';
  }
  if (e.ability === 'shape' && !b.transformed && e.hp <= e.maxHp * 0.6) return 'transform';
  if (e.ability === 'earth') {
    if (b.stoneSkin === 0 && r < 0.25) return 'stoneskin';
    if (r > 0.8) return 'quake';
  }
  if (e.ability === 'speed' && r < 0.45) return 'flurry';
  if (e.ability === 'crystal' && r < 0.25) return 'drain';
  const heavyChance = e.ability === 'heavy' ? 0.45 : e.ability === 'leap' ? 0.35 : 0.2;
  if (r < 0.12) return 'defend';
  if (rng() < heavyChance) return 'heavy';
  return 'attack';
}

function enemyDef(b) {
  let d = b.e.def + b.eDefMod;
  if (b.intent === 'heavy' || b.intent === 'dive') d -= 2;
  if (b.intent === 'defend') d += 3;
  if (b.stoneSkin > 0) d += 3;
  return d;
}

// תיאור הכוונה של היריב לתור הקרוב, כולל מספרים
function intentInfo(s, b) {
  const base = intentInfoBase(s, b);
  const risk = { heavy: 40, dive: 40, flurry: 30, quake: 50 }[b.intent];
  if (risk && !b.solo && activeAllies(s, b).length) {
    base.text += ` ⚠️ ${risk}% שאחד החברים ייפגע, אם לא {תתגונן|תתגונני}.${b.deadly ? ' פצע שני — בליגת הדם זה מוות.' : ''}`;
  }
  return base;
}

function intentInfoBase(s, b) {
  const e = b.e;
  const def = pDefense(s, b, false);
  const hitPct = (bonus) => pct2d6(def - (e.atk + bonus));
  const hitPctDef = (bonus) => pct2d6(pDefense(s, b, true) - (e.atk + bonus));
  const soak = pSoak(s);
  const d = (x) => Math.max(1, x - soak);
  switch (b.intent) {
    case 'stunned': return { icon: '💫', text: `${e.name} המום ולא יתקוף בתור הזה.` };
    case 'defend': return { icon: '🛡️', text: `${e.name} מתגונן: ההגנה שלו +3 בתור הזה, והוא לא יתקוף.` };
    case 'heavy': return { icon: '💥', text: `מכה כבדה: ${hitPct(1)}% לפגוע בך, ${d(Math.round(e.dmg * 1.6))} נזק (${hitPctDef(1)}% אם {תתגונן|תתגונני}). הוא נחשף: הגנתו 2−.` };
    case 'attack': return { icon: '⚔️', text: `התקפה רגילה: ${hitPct(0)}% לפגוע בך, ${d(e.dmg)} נזק (${hitPctDef(0)}% אם {תתגונן|תתגונני}).` };
    case 'flurry': return { icon: '⚡', text: `מטח מהיר: שתי מכות, כל אחת ${hitPct(0)}% לפגוע ו־${d(e.dmg - 1)} נזק.` };
    case 'takeoff': return { icon: '🪽', text: `${e.name} עומד להמריא לשני תורות. באוויר: נשק רגיל 3−, הקבוצה פוגעת בחצי.` };
    case 'dive': return { icon: '🦅', text: `צלילה מהאוויר: ${hitPct(2)}% לפגוע, ${d(e.dmg + 2)} נזק. הגנתו 2− בזמן הצלילה.` };
    case 'transform': return { icon: '🐻', text: `${e.name} משנה צורה! הוא יתרפא ב־8 ויכה חזק יותר מעכשיו. לא יתקוף בתור הזה.` };
    case 'stoneskin': return { icon: '🪨', text: `${e.name} עוטה עור אבן: +3 הגנה לשני תורות. לא יתקוף בתור הזה.` };
    case 'drain': return { icon: '🩸', text: `${e.name} יונק ממך כוח חיים: 3 נזק בטוח (שריון לא עוזר, 2 אם {תתגונן|תתגונני}), והוא מתרפא ב־3.` };
    case 'quake': return { icon: '🌋', text: `רעידת אדמה: 3 נזק בטוח (2 אם {תתגונן|תתגונני}), והקבוצה שלך לא תוקפת בתור הזה.` };
    default: return { icon: '?', text: '' };
  }
}

// אחוז הסיכוי ש-2d6 >= need
function pct2d6(need) {
  let ok = 0;
  for (let a = 1; a <= 6; a++) for (let c = 1; c <= 6; c++) if (a + c >= need) ok++;
  return Math.round((ok / 36) * 100);
}

function flightPenalty(s, b) {
  return b.airborne > 0 && !weapon(s).reach ? 3 : 0;
}

// מידע על הפעולות, לתצוגה לפני הבחירה
function actionInfo(s, b) {
  const def = enemyDef(b);
  const w = weapon(s);
  const atkB = pAttackBonus(s) - flightPenalty(s, b);
  const pwB = pPowerBonus(s);
  return {
    attack: { pct: pct2d6(def - atkB), bonus: atkB, def, dmg: w.dmg + trinketDmg(s) },
    power: { pct: pct2d6(def - pwB), bonus: pwB, def, dmg: powerBase(s, b) },
  };
}

function powerBase(s, b) {
  const n = 3 + s.powerLevel + (weapon(s).powerDmg || 0) + trinketDmg(s) + (s.power === 'fire' ? 2 : 0);
  return b.e.ability === 'crystal' ? Math.ceil(n / 2) : n;
}

function logRoll(b, who, d1, d2, parts, total, target, hit) {
  b.log.push({ t: who, dice: [d1, d2], text: `${parts.join(' + ')} = ${total} מול ${target}`, hit });
}

function dealToEnemy(b, n, byPlayer) {
  const e = b.e;
  const real = Math.min(n, e.hp);
  e.hp -= real;
  if (byPlayer) b.pDmg += real;
  else b.tDmg += real;
  if (e.hp <= 0 && byPlayer) b.finisher = true;
  return real;
}

function battleAct(s, action, arg) {
  const b = s.battle;
  if (!b || b.over) return;
  const e = b.e;
  let defending = false;
  const w = weapon(s);
  const extraDmg = trinketDmg(s);

  b.log.push({ t: 'round', text: `תור ${b.round}` });

  // ----- התור שלך -----
  if (action === 'attack') {
    const d1 = d6(), d2 = d6();
    const pen = flightPenalty(s, b);
    const def = enemyDef(b);
    const total = d1 + d2 + s.stats[w.stat] + w.atk - pen;
    const parts = [`${d1}+${d2}`, `${STAT_NAMES[w.stat]} ${s.stats[w.stat]}`];
    if (w.atk) parts.push(`${w.name} ${w.atk}`);
    if (pen) parts.push(`באוויר 3−`);
    const hit = total >= def;
    logRoll(b, 'you', d1, d2, parts, total, `הגנה ${def}`, hit);
    if (hit) {
      const margin = total - def;
      let dmg = w.dmg + extraDmg + Math.floor(margin / 2);
      let crit = false;
      if (w.crit && margin >= 4) { dmg *= 2; crit = true; }
      const real = dealToEnemy(b, dmg, true);
      b.log.push({ t: 'good', text: `פגיעה${crit ? ' קריטית' : ''}! ${real} נזק (${w.dmg} נשק${extraDmg ? ' + ' + extraDmg + ' קמע' : ''}${Math.floor(margin / 2) ? ' + ' + Math.floor(margin / 2) + ' עודף' : ''}${crit ? ' ×2' : ''}).` });
    } else {
      b.log.push({ t: 'bad', text: 'החטאה.' });
    }
  } else if (action === 'power') {
    b.charges--;
    const d1 = d6(), d2 = d6();
    const def = enemyDef(b);
    const k = mainStat(s);
    const total = d1 + d2 + s.stats[k] + s.powerLevel;
    const hit = total >= def;
    logRoll(b, 'you', d1, d2, [`${d1}+${d2}`, `${STAT_NAMES[k]} ${s.stats[k]}`, `${POWERS[s.power].name} ${s.powerLevel}`], total, `הגנה ${def}`, hit);
    if (hit) {
      const margin = total - def;
      let dmg = 3 + s.powerLevel + (w.powerDmg || 0) + extraDmg + Math.floor(margin / 2) + (s.power === 'fire' ? 2 : 0);
      if (e.ability === 'crystal') {
        dmg = Math.ceil(dmg / 2);
        e.hp = Math.min(e.maxHp, e.hp + 2);
        b.log.push({ t: 'bad', text: '💎 הקריסטל שותה חלק מהכוח שלך: חצי נזק, והוא מתרפא ב־2.' });
      }
      const real = dealToEnemy(b, dmg, true);
      const fx = {
        fire: 'הלהבות שורפות אותו (+2 נזק).',
        shadow: '{אתה נבלע|את נבלעת} בצל: ההתקפה הבאה שלו נגדך 3−.',
        shield: 'חומת האור נשארת לפניך: הנזק הבא שיגיע אליך ייחצה, והקבוצה מוגנת.',
        voice: 'הקול שלך מקפיא אותו: הוא יפסיד את התור הבא.',
      }[s.power];
      if (s.power === 'shadow') b.shadowed = true;
      if (s.power === 'shield') { b.shielded = true; b.protect += 2; }
      if (s.power === 'voice') b.stun = Math.max(b.stun, 1);
      b.log.push({ t: 'power', text: `${POWERS[s.power].icon} ${POWERS[s.power].name} פוגעת! ${real} נזק. ${fx}` });
    } else {
      b.log.push({ t: 'bad', text: `${POWERS[s.power].icon} הכוח מתפרץ, אבל מחטיא. המטען בוזבז.` });
    }
  } else if (action === 'defend') {
    defending = true;
    b.protect += 1;
    b.log.push({ t: 'info', text: `{אתה מתגונן|את מתגוננת}: הגנה +4 בתור הזה, ו{אתה מגן|את מגינה} על הקבוצה. אם הוא יחטיא, {תחזיר|תחזירי} מכה.` });
  } else if (action === 'ally') {
    const id = arg;
    b.used.push(id);
    b.commands++;
    const n = COMPANIONS[id].name;
    const sk = ALLY_SKILLS[id];
    const hitAlly = (dmg) => dealToEnemy(b, dmg, false);
    let text = '';
    switch (id) {
      case 'noa': {
        const h = Math.min(5, s.maxHp - s.hp);
        s.hp += h;
        const healed = Object.keys(b.wounds).filter((w) => b.wounds[w] > 0 && !b.out.includes(w));
        healed.forEach((w) => { b.wounds[w] = 0; });
        text = `${h} חיים חזרו אליך${healed.length ? `, והפצעים של ${names(healed)} נסגרו` : ''}.`;
        break;
      }
      case 'itay': case 'kira': text = `${hitAlly(5)} נזק.`; break;
      case 'alon': text = `${hitAlly(7)} נזק.`; break;
      case 'rena': text = `${n} הופכת לדוב ענק: ${hitAlly(6)} נזק.`; break;
      case 'maya': b.eDefMod -= 3; text = 'ההגנה שלו 3− עד סוף הקרב.'; break;
      case 'daniel': b.stun = Math.max(b.stun, 1); text = 'הוא יפסיד את התור הבא.'; break;
      case 'borg': b.block = true; text = 'ההתקפה הבאה שלו תיחסם לגמרי.'; break;
      case 'yoav': b.eDefMod -= 1; text = `${hitAlly(3)} נזק, והגנתו 1−.`; break;
      case 'ziv': case 'iris': b.airborne = 0; text = `${hitAlly(4)} נזק. הוא כבר לא באוויר.`; break;
      case 'goren': b.pDefMod += 3; text = 'ההגנה שלך +3 עד סוף הקרב.'; break;
    }
    b.log.push({ t: 'ally', text: `📣 ${n} — ${sk.name}: ${text}` });
  } else if (action === 'item') {
    s.inv[arg]--;
    if (arg === 'potion') {
      const h = Math.min(6, s.maxHp - s.hp);
      s.hp += h;
      b.log.push({ t: 'good', text: `🧪 שתית שיקוי ריפוי: ${h} חיים.` });
    } else if (arg === 'smoke') {
      b.smoke = true;
      b.log.push({ t: 'info', text: '💨 ענן עשן: ההתקפה הבאה שלו תחטיא.' });
    } else if (arg === 'net') {
      b.stun = Math.max(b.stun, 1);
      b.airborne = 0;
      b.log.push({ t: 'info', text: '🕸️ הרשת לוכדת אותו: הוא מפסיד את התור הבא ונופל לקרקע.' });
    }
  } else if (action === 'surrender') {
    b.log.push({ t: 'bad', text: '🏳️ {הרמת|הרמת} יד. הקרב נגמר.' });
    return endRound(s, 'surrender');
  }

  if (e.hp <= 0) return endRound(s, 'win');

  // ----- התור של היריב -----
  enemyTurn(s, b, defending);
  // מכות חזקות מסכנות גם את הקבוצה, אלא אם השחקן התגונן או שהמכה נחסמה
  if (!defending && !b.lastBlocked) {
    const risk = { heavy: 0.4, dive: 0.4, flurry: 0.3, quake: 0.5 }[b.intent] || 0;
    if (risk) hurtAlly(s, b, risk);
  }
  b.lastBlocked = false;
  if (s.hp <= 0) return endRound(s, 'ko');

  // ----- הקבוצה -----
  if (!b.solo) {
    const allies = activeAllies(s, b);
    const team = allies.length;
    if (team && b.intent !== 'quake') {
      let dmg = team;
      if (b.airborne > 0) dmg = Math.floor(dmg / 2);
      if (dmg > 0) {
        const real = dealToEnemy(b, dmg, false);
        b.log.push({ t: 'ally', text: `👥 הקבוצה (${names(allies)}) תוקפת: ${real} נזק${b.airborne > 0 ? ' (חצי — הוא באוויר)' : ''}.` });
      }
    }
    if (e.hp <= 0) return endRound(s, 'win');
  }

  if (b.stoneSkin > 0) b.stoneSkin--;
  b.round++;
  if (b.round > b.maxRounds) return endRound(s, 'time');
  b.intent = pickIntent(b);
}

function enemyTurn(s, b, defending) {
  const e = b.e;
  const intent = b.intent;
  if (intent === 'stunned') {
    b.stun = Math.max(0, b.stun - 1);
    b.log.push({ t: 'info', text: `💫 ${e.name} המום ולא תוקף.` });
    return;
  }
  const attack = (bonus, dmg) => {
    if (b.smoke) {
      b.smoke = false;
      b.log.push({ t: 'good', text: `💨 ${e.name} מכה לתוך העשן ומחטיא.` });
      return;
    }
    if (b.block) {
      b.block = false;
      b.lastBlocked = true;
      b.log.push({ t: 'good', text: `🪨 חומת האבן של בורג חוסמת את המכה.` });
      return;
    }
    const d1 = d6(), d2 = d6();
    const shadow = b.shadowed ? 3 : 0;
    b.shadowed = false;
    const def = pDefense(s, b, defending);
    const total = d1 + d2 + e.atk + bonus - shadow;
    const parts = [`${d1}+${d2}`, `התקפה ${e.atk + bonus}`];
    if (shadow) parts.push('צל 3−');
    const hit = total >= def;
    logRoll(b, 'enemy', d1, d2, parts, total, `ההגנה שלך ${def}`, hit);
    if (hit) {
      let n = Math.max(1, dmg - pSoak(s));
      if (defending) n = Math.ceil(n / 2);
      if (b.shielded) { n = Math.ceil(n / 2); b.shielded = false; }
      s.hp = Math.max(0, s.hp - n);
      b.log.push({ t: 'bad', text: `${e.name} פוגע בך: ${n} נזק${pSoak(s) ? ` (השריון ספג ${Math.min(pSoak(s), dmg - 1)})` : ''}${defending ? ', חצי בזכות ההתגוננות' : ''}.` });
    } else {
      b.log.push({ t: 'good', text: `${e.name} מחטיא.` });
      if (defending) {
        const real = dealToEnemy(b, 2, true);
        b.log.push({ t: 'good', text: `↩️ מכת נגד: ${real} נזק.` });
      }
    }
  };
  switch (intent) {
    case 'defend': b.log.push({ t: 'info', text: `🛡️ ${e.name} מתגונן.` }); break;
    case 'attack': attack(0, e.dmg); break;
    case 'heavy': attack(1, Math.round(e.dmg * 1.6)); break;
    case 'flurry': attack(0, e.dmg - 1); if (s.hp > 0) attack(0, e.dmg - 1); break;
    case 'dive': b.airborne = Math.max(0, b.airborne - 1); attack(2, e.dmg + 2); break;
    case 'takeoff': b.airborne = 2; b.log.push({ t: 'info', text: `🪽 ${e.name} ממריא לאוויר.` }); break;
    case 'transform':
      b.transformed = true;
      e.hp = Math.min(e.maxHp + 8, e.hp + 8);
      e.maxHp = Math.max(e.maxHp, e.hp);
      e.atk += 1;
      e.dmg += 2;
      b.log.push({ t: 'bad', text: `🐻 ${e.name} משנה צורה לחיה ענקית! +8 חיים, מכות חזקות יותר.` });
      break;
    case 'stoneskin': b.stoneSkin = 3; b.log.push({ t: 'info', text: `🪨 ${e.name} מתכסה באבן: +3 הגנה.` }); break;
    case 'drain': {
      const n = defending ? 2 : 3;
      s.hp = Math.max(0, s.hp - n);
      const h = Math.min(3, e.maxHp - e.hp);
      e.hp += h;
      b.log.push({ t: 'bad', text: `🩸 ${e.name} יונק ממך ${n} חיים ומתרפא ב־${h}.` });
      break;
    }
    case 'quake': {
      let n = defending ? 2 : 3;
      s.hp = Math.max(0, s.hp - n);
      b.log.push({ t: 'bad', text: `🌋 האדמה רועדת: ${n} נזק, והקבוצה שלך מאבדת את שיווי המשקל.` });
      break;
    }
  }
}

function endRound(s, why) {
  const b = s.battle;
  const e = b.e;
  let won = why === 'win';
  let reason = '';
  if (why === 'win') reason = `${e.name} נופל על החול.`;
  if (why === 'ko') reason = 'החיים שלך הגיעו ל־0. {נפלת|נפלת}.';
  if (why === 'surrender') reason = '{נכנעת|נכנעת}. {אתה יוצא|את יוצאת} מהזירה בלי פרס, אבל עם מה שנשאר לך.';
  if (why === 'time') {
    const ePct = e.hp / e.maxHp;
    const pPct = s.hp / s.maxHp;
    won = ePct < pPct;
    reason = `עברו ${b.maxRounds} תורות. השופטים מכריעים לפי מי שנפגע יותר: ל${e.name} נשארו ${Math.round(ePct * 100)}% חיים, לך ${Math.round(pPct * 100)}%. ${won ? 'הניצחון שלך.' : 'הניצחון שלו.'}`;
  }
  // השפעה: הנזק שלך + הגנה על הקבוצה + פקודות, מול מה שהקבוצה עשתה
  const impact = b.pDmg + b.protect * 2 + b.commands;
  const share = impact / Math.max(1, impact + b.tDmg);
  let gold = 0;
  const lines = [];
  if (why !== 'surrender') {
    if (won) {
      const baseCut = Math.round(e.purse * 0.3);
      const impactCut = Math.round(e.purse * 0.7 * share);
      gold = baseCut + impactCut;
      lines.push(`דמי ניצחון: ${baseCut}`);
      lines.push(`חלקך לפי השפעה (${Math.round(share * 100)}%): ${impactCut}`);
      if (b.finisher) { gold += 2; lines.push('מכת סיום: 2'); }
    } else {
      gold = Math.round(e.purse * 0.25 * share);
      lines.push(`דמי השתתפות לפי השפעה (${Math.round(share * 100)}%): ${gold}`);
    }
  }
  b.over = { won, why, reason, gold, lines, impact, share, pDmg: b.pDmg, tDmg: b.tDmg, protect: b.protect, commands: b.commands, rounds: Math.min(b.round, b.maxRounds) };
}

// סיום הקרב והמעבר לסצנה הבאה
function finishBattle(s) {
  const b = s.battle;
  const o = b.over;
  s.notes = [];
  s.lastRoll = null;
  s.lastBattle = { enemy: b.e.name, won: o.won, why: o.why, gold: o.gold };
  if (o.gold) addGold(s, o.gold);
  let next = o.won ? b.win : b.lose;
  const fallen = b.fallen || [];
  fallen.forEach((id) => setStatus(s, id, 'dead'));
  s.battle = null;
  if (o.why === 'ko') {
    if (b.deadly) {
      note(s, 'ליגת הדם: {נפלת|נפלת} בלי להיכנע', 'down');
      next = guardDeath(s, next);
    } else {
      s.hp = 1;
      note(s, '{נגררת|נגררת} מהזירה עם 1 חיים', 'down');
    }
  }
  if (fallen.length) next = queueGrief(s, fallen, next);
  enterScene(s, next);
}

// ---------- הערכת סיכויים ----------

// מדיניות פשוטה של "שחקן סביר", לשימוש בהדמיות
function autoAction(s, b) {
  if (s.hp <= 5 && s.inv.potion) return ['item', 'potion'];
  const avail = activeAllies(s, b).filter((id) => ALLY_SKILLS[id] && !b.used.includes(id));
  const wounded = Object.values(b.wounds).some((w) => w === 1);
  if (!b.solo && wounded && ['heavy', 'dive', 'quake'].includes(b.intent)) return ['defend'];
  if (!b.solo && avail.length && b.round >= 2) return ['ally', avail[0]];
  if (b.charges > 0 && b.intent !== 'defend' && b.intent !== 'stunned' && b.e.ability !== 'crystal') return ['power'];
  if ((b.intent === 'heavy' || b.intent === 'dive' || b.intent === 'flurry') && s.hp <= e_dmg(b) * 2) return ['defend'];
  return ['attack'];
}

function e_dmg(b) {
  return Math.round(b.e.dmg * 1.6);
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

// מריץ את הקרב הרבה פעמים ומחזיר סיכוי ניצחון וזהב ממוצע
function estimateBattle(s, enemyId, mods, runs) {
  runs = runs || 300;
  let wins = 0;
  let gold = 0;
  let hpLeft = 0;
  for (let i = 0; i < runs; i++) {
    const c = cloneState(s);
    c.notes = [];
    startBattle(c, enemyId, { win: 'x', lose: 'x', mods });
    let guard = 0;
    while (!c.battle.over && guard++ < 20) {
      const [a, arg] = autoAction(c, c.battle);
      battleAct(c, a, arg);
    }
    if (c.battle.over.won) { wins++; hpLeft += c.hp; }
    gold += c.battle.over.gold;
  }
  return {
    win: Math.round((wins / runs) * 100),
    gold: Math.round(gold / runs),
    hpLeft: wins ? Math.round(hpLeft / wins) : 0,
  };
}

const battleApi = {
  ITEMS, SLOT_NAMES, ENEMIES, ABILITIES, ALLY_SKILLS,
  gearItem, weapon, gearSum, buyItem, equipItem, drinkPotion, pAttackBonus, pPowerBonus, pDefense, pSoak, maxCharges,
  startBattle, battleAct, activeAllies, finishBattle, intentInfo, actionInfo, enemyDef, pct2d6, estimateBattle, autoAction, cloneState,
};
Object.assign(globalThis, battleApi);
