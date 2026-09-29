// התפתחות הכוחות: לכל כוח 5 שלבים לאורך הסיפור, ולכל שלב יכולת חדשה בקרב.
//   שלב 2 — תחילת עונה 2     (יכולת פסיבית)
//   שלב 3 — תחילת עונה 3     (פעולה חדשה בקרב)
//   שלב 4 — החזרה מהתהום      (יכולת עליונה)
//   שלב 5 — המראה, בפרק 5    (התעלות)

const POWER_TREE = {
  fire: [
    { name: 'להבת הזעם', desc: 'אש שנולדת מכעס.' },
    { name: 'שריון אש', desc: 'האש עוטפת את הגוף כמו שריון: סופג 1 נזק נוסף מכל מכה, ומי שפוגע בך נכווה (1 נזק).' },
    { name: 'חרבות אש', desc: 'פעולה חדשה: שתי חרבות של להבה נשלפות מהידיים — שתי מכות בתור אחד.' },
    { name: 'עוף החול', desc: 'פעם בכל קרב: כשהחיים מגיעים ל־0, {אתה קם|את קמה} מהאפר עם חצי מהחיים.' },
    { name: 'שמש שנייה', desc: 'התעלות: הכוח בוער חזק מכל לב קריסטל — +3 נזק לכוח, +2 מטענים, ושום דבר לא שותה אותו.' },
  ],
  shadow: [
    { name: 'הליכת צל', desc: 'להיבלע בצללים.' },
    { name: 'גלימת צל', desc: 'הצל נצמד אלייך כמו גלימה: קשה יותר לפגוע בך (הגנה +1).' },
    { name: 'להבי צל', desc: 'פעולה חדשה: מכה מתוך הצל של היריב עצמו — פוגעת תמיד, בלי קשר להגנה.' },
    { name: 'צבא הצללים', desc: 'שני כפילים מצל נלחמים לצידך בכל קרב, גם בדו־קרב: +2 נזק בכל תור.' },
    { name: 'הלילה עצמו', desc: 'התעלות: +3 נזק לכוח, +2 מטענים, ושום דבר לא שותה אותו.' },
  ],
  shield: [
    { name: 'חומת האור', desc: 'מחסום של אור.' },
    { name: 'שריון אור', desc: 'האור נצמד לעור: סופג 1 נזק נוסף, והסיכוי שחבר ייפצע נחצה.' },
    { name: 'חנית אור', desc: 'פעולה חדשה: חנית של אור טהור — נזק גבוה, ומרפאה אותך ב־2.' },
    { name: 'המקדש', desc: 'פעם בכל קרב: כיפת אור שמרפאה אותך עד הסוף וסוגרת את כל הפצעים של הקבוצה.' },
    { name: 'האור הראשון', desc: 'התעלות: +3 נזק לכוח, +2 מטענים, ושום דבר לא שותה אותו.' },
  ],
  voice: [
    { name: 'קול הפקודה', desc: 'קול שמכריח לציית.' },
    { name: 'קול האימה', desc: 'כל יריב שומע את הקול שלך עוד לפני הקרב: ההתקפה שלו 1− מההתחלה.' },
    { name: 'קול הבגידה', desc: 'פעולה חדשה: פוקד על היריב להכות את עצמו — חצי ממכה כבדה שלו, ישר בו.' },
    { name: 'קול המלך', desc: 'פעם בכל קרב: מילה אחת, והיריב קופא לשני תורות.' },
    { name: 'המילה', desc: 'התעלות: +3 נזק לכוח, +2 מטענים, ושום דבר לא שותה אותו.' },
  ],
  shape: [
    { name: 'שינוי צורה', desc: 'להפוך לחיה.' },
    { name: 'עור של חיה', desc: 'הגוף זוכר את הצורות: הגנה +1.' },
    { name: 'המחקה', desc: 'פעולה חדשה: להפוך לאחד החברים — לקבל את הצורה שלו ואת היכולת שלו. גם אם היא כבר נוצלה. גם אם הוא כבר לא כאן.' },
    { name: 'אלף פנים', desc: 'פעם בכל קרב: להפוך ליריב עצמו — לקבל את הכוח שלו (הנזק שלו הופך לשלך) ואת העור שלו (הגנה +3).' },
    { name: 'כל הצורות', desc: 'התעלות: +3 נזק לכוח, +2 מטענים, ושום דבר לא שותה אותו.' },
  ],
};

function powerTier(s) {
  if (!s.power) return 0;
  return s.powerTier || 1;
}

function tierName(s) {
  return s.power ? POWER_TREE[s.power][powerTier(s) - 1].name : '';
}

function evolve(s, t) {
  if (!s.power || powerTier(s) >= t) return;
  s.powerTier = t;
  const node = POWER_TREE[s.power][t - 1];
  s.flags.evolveBanner = t;
  note(s, `✨ הכוח שלך התפתח: ${node.name}`, 'power');
}

// ---------- יכולות פסיביות ----------

function perkDef(s) {
  const t = powerTier(s);
  if (t >= 2 && s.power === 'shadow') return 1;
  if (t >= 2 && s.power === 'shape') return 1;
  return 0;
}

function perkSoak(s) {
  const t = powerTier(s);
  if (t >= 2 && (s.power === 'fire' || s.power === 'shield')) return 1;
  return 0;
}

function ascended(s) {
  return powerTier(s) >= 5;
}

// ---------- פעולות חדשות בקרב ----------

// פעולות של שלב 3 (עולות מטען) ושל שלב 4 (פעם בקרב)
function evoActions(s, b) {
  const t = powerTier(s);
  const list = [];
  if (!s.power || b.berserk) return list;
  const lvl = s.powerLevel + (ascended(s) ? 3 : 0);
  if (t >= 3) {
    const a = {
      fire: { id: 'flameblades', label: '🔥 חרבות אש', sub: `שתי מכות, כל אחת ${pct2d6(enemyDef(b) - pPowerBonus(s))}% · ${1 + Math.ceil(lvl / 2)}+ נזק · מטען` },
      shadow: { id: 'shadowstrike', label: '🌑 להבי צל', sub: `פוגע תמיד · ${3 + Math.ceil(lvl / 2)} נזק · מטען` },
      shield: { id: 'lightspear', label: '✨ חנית אור', sub: `${pct2d6(enemyDef(b) - pPowerBonus(s))}% · ${3 + lvl}+ נזק, מרפא 2 · מטען` },
      voice: { id: 'turn', label: '📯 קול הבגידה', sub: `${pct2d6(enemyDef(b) - pPowerBonus(s) + 2)}% · הוא מכה את עצמו: ${Math.round(b.e.dmg * 0.7) + Math.floor(lvl / 3)} נזק · מטען` },
    }[s.power];
    if (a) list.push({ ...a, cost: 'charge' });
    if (s.power === 'shape') {
      Object.keys(s.crew).filter((id) => ALLY_SKILLS[id]).forEach((id) => {
        const st = s.crew[id].status;
        list.push({ id: 'mimic', arg: id, label: `🎭 להפוך ל${COMPANIONS[id].name}`, sub: `${ALLY_SKILLS[id].name}: ${ALLY_SKILLS[id].desc}${st === 'dead' ? ' · לזכרו' : ''} · מטען`, cost: 'charge' });
      });
    }
  }
  if (t >= 4) {
    const u = {
      shield: { id: 'sanctuary', label: '⛪ המקדש', sub: 'מרפא אותך עד הסוף וסוגר את כל פצעי הקבוצה · פעם בקרב' },
      voice: { id: 'kingvoice', label: '👑 קול המלך', sub: 'היריב קופא לשני תורות · פעם בקרב' },
      shape: { id: 'becomeEnemy', label: `🎭 אלף פנים: להפוך ל${b.e.name}`, sub: `הנזק שלו (${b.e.dmg}) הופך לשלך, הגנה +3 · פעם בקרב` },
    }[s.power];
    if (u) list.push({ ...u, cost: 'ult' });
  }
  return list;
}

function powerDmgBonus(s) {
  return ascended(s) ? 3 : 0;
}

const EVO_ACTIONS = ['flameblades', 'shadowstrike', 'lightspear', 'turn', 'mimic', 'sanctuary', 'kingvoice', 'becomeEnemy'];

// אחרי שהחיים הגיעו ל-0: עוף החול קם מהאפר, פעם בקרב
function tryRebirth(s, b) {
  if (s.power !== 'fire' || powerTier(s) < 4 || b.reborn) return false;
  b.reborn = true;
  s.hp = Math.ceil(s.maxHp / 2);
  b.log.push({ t: 'power', text: `🔥 {אתה נופל|את נופלת}. ואז האפר נדלק. עוף החול קם — ${s.hp} חיים.` });
  return true;
}

// מבצע פעולת התפתחות. מחזיר true אם טופלה.
function evoAct(s, b, action, arg) {
  const e = b.e;
  const lvl = s.powerLevel + powerDmgBonus(s);
  const icon = POWERS[s.power].icon;
  const roll = (bonus) => {
    const d1 = d6(), d2 = d6();
    const def = enemyDef(b);
    const k = mainStat(s);
    const total = d1 + d2 + s.stats[k] + s.powerLevel + (bonus || 0);
    const hit = total >= def;
    logRoll(b, 'you', d1, d2, [`${d1}+${d2}`, `${STAT_NAMES[k]} ${s.stats[k]}`, `${tierName(s)} ${s.powerLevel}`].concat(bonus ? [`${bonus >= 0 ? '+' : ''}${bonus}`] : []), total, `הגנה ${def}`, hit);
    return { hit, margin: total - def };
  };
  switch (action) {
    case 'flameblades': {
      b.charges--;
      for (let i = 0; i < 2 && e.hp > 0; i++) {
        const r = roll(0);
        if (r.hit) {
          const real = dealToEnemy(b, 1 + Math.ceil(lvl / 2) + Math.floor(r.margin / 3), true);
          b.log.push({ t: 'power', text: `🔥 חרב אש ${i + 1} חותכת: ${real} נזק.` });
        } else {
          b.log.push({ t: 'bad', text: `🔥 חרב אש ${i + 1} מחטיאה.` });
        }
      }
      return true;
    }
    case 'shadowstrike': {
      b.charges--;
      const real = dealToEnemy(b, 2 + Math.ceil(lvl / 2) + 1, true);
      b.log.push({ t: 'power', text: `🌑 {אתה יוצא|את יוצאת} מתוך הצל שלו, מאחוריו: ${real} נזק. אין הגנה מפני הצל של עצמך.` });
      return true;
    }
    case 'lightspear': {
      b.charges--;
      const r = roll(0);
      if (r.hit) {
        const real = dealToEnemy(b, 3 + lvl + Math.floor(r.margin / 2), true);
        const h = Math.min(2, s.maxHp - s.hp);
        s.hp += h;
        b.log.push({ t: 'power', text: `✨ חנית האור ננעצת בו: ${real} נזק, ו־${h} חיים חוזרים אליך.` });
      } else {
        b.log.push({ t: 'bad', text: '✨ החנית מחטיאה ונמסה באוויר.' });
      }
      return true;
    }
    case 'turn': {
      b.charges--;
      const r = roll(-2);
      if (r.hit) {
        const real = dealToEnemy(b, Math.round(e.dmg * 0.7) + Math.floor(lvl / 3), true);
        b.log.push({ t: 'power', text: `📯 "תכה את עצמך." והוא מכה. ${real} נזק, מהיד של ${e.name} עצמו.` });
      } else {
        b.log.push({ t: 'bad', text: '📯 הוא מתנגד לקול. בקושי.' });
      }
      return true;
    }
    case 'mimic': {
      b.charges--;
      const id = arg;
      const n = COMPANIONS[id].name;
      let text = '';
      switch (id) {
        case 'noa': { const h = Math.min(5, s.maxHp - s.hp); s.hp += h; Object.keys(b.wounds).forEach((w) => { if (!b.out.includes(w)) b.wounds[w] = 0; }); text = `${h} חיים, והפצעים של הקבוצה נסגרו.`; break; }
        case 'itay': case 'kira': text = `${dealToEnemy(b, 5, true)} נזק.`; break;
        case 'alon': case 'grom': text = `${dealToEnemy(b, 7, true)} נזק.`; break;
        case 'rena': text = `${dealToEnemy(b, 6, true)} נזק.`; break;
        case 'maya': b.eDefMod -= 3; text = 'הגנתו 3− עד סוף הקרב.'; break;
        case 'daniel': b.stun = Math.max(b.stun, 1); text = 'הוא יפסיד את התור הבא.'; break;
        case 'borg': b.block = true; text = 'ההתקפה הבאה שלו תיחסם.'; break;
        case 'yoav': b.eDefMod -= 1; text = `${dealToEnemy(b, 3, true)} נזק, והגנתו 1−.`; break;
        case 'ziv': case 'iris': b.airborne = 0; text = `${dealToEnemy(b, 4, true)} נזק, והוא נופל מהאוויר.`; break;
        case 'goren': b.pDefMod += 3; text = 'ההגנה שלך +3 עד סוף הקרב.'; break;
      }
      const dead = s.crew[id] && s.crew[id].status === 'dead';
      b.log.push({ t: 'power', text: `🎭 הגוף שלך משתנה. לרגע {אתה|את} ${n}${dead ? ' — כמו שהיה, לפני' : ''}. ${ALLY_SKILLS[id].name}: ${text}` });
      return true;
    }
    case 'sanctuary': {
      b.ultUsed = true;
      s.hp = s.maxHp;
      Object.keys(b.wounds).forEach((w) => { if (!b.out.includes(w)) b.wounds[w] = 0; });
      b.protect += 3;
      b.log.push({ t: 'power', text: '⛪ כיפה של אור יורדת עליכם. החיים שלך מתמלאים, והפצעים של כולם נסגרים.' });
      return true;
    }
    case 'kingvoice': {
      b.ultUsed = true;
      b.stun = Math.max(b.stun, 2);
      b.log.push({ t: 'power', text: `👑 מילה אחת. ${e.name} קופא, והזירה כולה שותקת. שני תורות.` });
      return true;
    }
    case 'becomeEnemy': {
      b.ultUsed = true;
      b.mimicDmg = e.dmg;
      b.pDefMod += 3;
      b.log.push({ t: 'power', text: `🎭 {אתה הופך|את הופכת} ל${e.name}. אותו גוף, אותה עוצמה. מעכשיו המכות שלך הן המכות שלו (${e.dmg} נזק), וההגנה שלך +3.` });
      return true;
    }
  }
  return false;
}

function migratePowerTier(s) {
  if (!s.power || s.powerTier) return;
  let t = 1;
  if (s.season >= 2) t = 2;
  if (s.season >= 3) t = 3;
  if (has(s, 'redeemed')) t = 4;
  s.powerTier = t;
}
