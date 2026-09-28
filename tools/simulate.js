// בדיקה אוטומטית: טוען את הסיפור, בודק קישורים ומריץ אלפי משחקים אקראיים.
// הרצה: node tools/simulate.js [מספר משחקים]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console });
for (const f of ['js/core.js', 'js/battle.js', 'js/story.js', 'js/story2.js', 'js/story3.js', 'js/endings.js', 'js/dark.js', 'js/light.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const G = ctx;
const SCENES = vm.runInContext('SCENES', ctx);

const errors = [];

// קישורים סטטיים
for (const [id, sc] of Object.entries(SCENES)) {
  if (typeof sc.choices === 'function') continue;
  for (const c of sc.choices || []) {
    for (const k of ['next', 'success', 'fail']) {
      if (typeof c[k] === 'string' && !SCENES[c[k]]) errors.push(`${id}: קישור שבור ${k} -> ${c[k]}`);
    }
  }
  if (!sc.ending && !sc.redirect && !sc.choices) errors.push(`${id}: אין בחירות`);
}

function checkText(s, where, text) {
  if (/[{}|]/.test(text)) errors.push(`${where}: סימון מגדר שלא הוחלף: ${text.match(/.{0,20}[{}|].{0,20}/)[0]}`);
  if (/undefined|NaN|\[object/.test(text)) errors.push(`${where}: ערך חסר בטקסט`);
}

const runs = Number(process.argv[2]) || 5000;
const endings = {};
const visited = new Set();
let maxSteps = 0;
const battleStats = {};
const fallenHist = {};
const fallenWho = {};
let smartDeaths = 0;

for (let i = 0; i < runs; i++) {
  const s = G.newState('בדיקה', i % 2 ? 'f' : 'm');
  G.enterScene(s, 'p_class');
  let steps = 0;
  const smart = i % 3 !== 0; // שני שלישים משחקים "חכם", שליש אקראי
  try {
    while (true) {
      if (s.battle) {
        const b = s.battle;
        if (!b.over) {
          const info = G.intentInfo(s, b);
          checkText(s, 'intent ' + b.enemyId, G.fmt(s, info.text));
          let act = G.autoAction(s, b);
          if (smart && b.deadly && s.hp <= 4 && b.e.hp / b.e.maxHp > 0.4) act = ['surrender'];
          if (!smart && Math.random() < 0.5) act = [['attack'], ['defend'], ['attack']][Math.floor(Math.random() * 3)];
          G.battleAct(s, act[0], act[1]);
          if (++steps > 400) { errors.push('קרב אינסופי ' + b.enemyId); break; }
          continue;
        }
        b.log.forEach((l) => checkText(s, 'battle log ' + b.enemyId, G.fmt(s, l.text)));
        const st = (battleStats[b.enemyId + (smart ? '' : '*')] ||= { n: 0, w: 0, gold: 0 });
        st.n++; if (b.over.won) st.w++; st.gold += b.over.gold;
        G.finishBattle(s);
        continue;
      }
      // קניות בנשקייה
      if (smart) {
        const want = ['sword', 'bronze', 'amulet', 'potion', 'staff', 'scale', 'axe'];
        for (const id of want) {
          const it = G.ITEMS[id];
          if (it.slot !== 'use' && s.owned.includes(id)) continue;
          if (s.gold >= it.price + 3 && Math.random() < 0.5) G.buyItem(s, id);
        }
      }
      const sc = SCENES[s.scene];
      visited.add(s.scene);
      checkText(s, s.scene, G.sceneText(s, sc));
      const ch = typeof sc.chapter === 'function' ? sc.chapter(s) : sc.chapter;
      if (sc.ending) {
        if (smart) {
          const fl = G.fallenIds(s);
          fallenHist[fl.length] = (fallenHist[fl.length] || 0) + 1;
          fl.forEach((id) => { fallenWho[id] = (fallenWho[id] || 0) + 1; });
        }
        endings[s.scene] = (endings[s.scene] || 0) + 1;
        if (smart && s.scene === 'end_death') smartDeaths++;
        break;
      }
      const vis = G.visibleChoices(s, sc);
      vis.forEach((c) => checkText(s, s.scene + ' (בחירה)', G.fmt(s, c.text)));
      const avail = vis.filter((c) => G.isAvailable(s, c));
      if (!avail.length) {
        errors.push(`${s.scene}: אין בחירה זמינה`);
        break;
      }
      // לא לבחור "להתחרט" שוב ושוב
      let pool = avail;
      if (s.scene === 'esc_start' && Math.random() < 0.8) pool = avail.filter((c) => c.next !== 'season_end') || avail;
      if (!pool.length) pool = avail;
      G.choose(s, pool[Math.floor(Math.random() * pool.length)]);
      if (++steps > 200) {
        errors.push(`לולאה אינסופית ליד ${s.scene}`);
        break;
      }
    }
  } catch (e) {
    errors.push(`${s.scene}: חריגה: ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
  }
  maxSteps = Math.max(maxSteps, steps);
}

const unvisited = Object.keys(SCENES).filter((id) => !visited.has(id));
const uniq = [...new Set(errors)];
console.log(`סצנות: ${Object.keys(SCENES).length}, משחקים: ${runs}, מקסימום צעדים: ${maxSteps}`);
console.log('סופים:', endings);
console.log('חברים שמתו במשחק (זהירים):', fallenHist, fallenWho);
console.log(`מוות אצל שחקנים זהירים: ${((smartDeaths / (runs * 2 / 3)) * 100).toFixed(1)}%`);
for (const [k, v] of Object.entries(battleStats)) console.log(`קרב ${k.padEnd(12)} ניצחונות ${Math.round((v.w / v.n) * 100)}%  זהב ממוצע ${(v.gold / v.n).toFixed(1)}  (${v.n})`);
if (unvisited.length) console.log('סצנות שלא בוקרו:', unvisited.join(', '));
if (uniq.length) {
  console.log(`\n${uniq.length} שגיאות:`);
  uniq.slice(0, 40).forEach((e) => console.log(' - ' + e));
  process.exit(1);
}
console.log('✔ הכול תקין');
