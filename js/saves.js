// מערכת שמירה: שמירה אוטומטית, נקודות שמירה אוטומטיות, 3 משבצות ידניות, וקוד שמירה להעברה בין מכשירים.
// הכול נשמר ב-localStorage תחת מפתח אחד.

const SAVES_KEY = 'arena-saves-v2';
const OLD_SAVE_KEY = 'arena-save-v1';
const MAX_CHECKPOINTS = 12;
const SLOT_COUNT = 3;

let storageOK = true;
let memoryDB = null; // גיבוי בזיכרון כשהדפדפן חוסם שמירה

function emptyDB() {
  return { auto: null, slots: Array(SLOT_COUNT).fill(null), checkpoints: [] };
}

function readDB() {
  if (!storageOK) return memoryDB || (memoryDB = emptyDB());
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    let db = raw ? JSON.parse(raw) : null;
    if (!db) {
      db = emptyDB();
      // שמירה מהגרסה הקודמת
      const old = localStorage.getItem(OLD_SAVE_KEY);
      if (old) {
        const st = JSON.parse(old);
        db.auto = makeEntry(st, 'שמירה אוטומטית');
        localStorage.setItem(SAVES_KEY, JSON.stringify(db));
        localStorage.removeItem(OLD_SAVE_KEY);
      }
    }
    db.slots = db.slots || Array(SLOT_COUNT).fill(null);
    while (db.slots.length < SLOT_COUNT) db.slots.push(null);
    db.checkpoints = db.checkpoints || [];
    return db;
  } catch (e) {
    storageOK = false;
    return memoryDB || (memoryDB = emptyDB());
  }
}

function writeDB(db) {
  memoryDB = db;
  if (!storageOK) return false;
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    // אולי נגמר המקום — לנסות שוב עם פחות נקודות שמירה
    try {
      db.checkpoints = db.checkpoints.slice(0, 4);
      localStorage.setItem(SAVES_KEY, JSON.stringify(db));
      return true;
    } catch (e2) {
      storageOK = false;
      return false;
    }
  }
}

// בדיקה אמיתית שהדפדפן מאפשר לשמור
function probeStorage() {
  try {
    const k = '__arena_probe__';
    localStorage.setItem(k, '1');
    const ok = localStorage.getItem(k) === '1';
    localStorage.removeItem(k);
    storageOK = ok;
  } catch (e) {
    storageOK = false;
  }
  // לבקש מהדפדפן לא למחוק את הנתונים שלנו
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) { /* לא נתמך */ }
  return storageOK;
}

function sceneTitleOf(st) {
  const sc = SCENES[st.scene];
  if (!sc) return '';
  if (st.battle) return 'קרב: ' + st.battle.e.name;
  return fmt(st, sc.title);
}

function chapterOf(st) {
  const sc = SCENES[st.scene];
  if (!sc) return '';
  const c = typeof sc.chapter === 'function' ? sc.chapter(st) : sc.chapter;
  return sc.ending ? 'סוף' : c || '';
}

function makeEntry(st, label) {
  return {
    label,
    time: Date.now(),
    meta: {
      name: st.name,
      chapter: chapterOf(st),
      title: sceneTitleOf(st),
      season: st.season,
      hp: st.hp,
      maxHp: st.maxHp,
      gold: st.gold,
      team: teamCount(st),
      ending: !!(SCENES[st.scene] && SCENES[st.scene].ending),
    },
    state: JSON.parse(JSON.stringify(st)),
  };
}

// נקרא אחרי כל פעולה
function autosave(st) {
  const db = readDB();
  db.auto = makeEntry(st, 'שמירה אוטומטית');
  maybeCheckpoint(db, st);
  return writeDB(db);
}

// נקודת שמירה בתחילת כל פרק חדש ולפני כל קרב
function maybeCheckpoint(db, st) {
  if (st.battle) return;
  const sc = SCENES[st.scene];
  if (!sc) return;
  const chapter = chapterOf(st);
  const last = db.checkpoints[0];
  const beforeBattle = visibleChoices(st, sc).some((c) => c.battle);
  const newChapter = !last || last.meta.chapter !== chapter;
  const endingPoint = sc.ending && (!last || last.state.scene !== st.scene);
  if (!(newChapter || beforeBattle || endingPoint)) return;
  if (last && last.state.scene === st.scene && last.state.steps === st.steps) return;
  const label = sc.ending ? (sc.teaser ? 'סוף עונה 2' : 'סוף: ' + fmt(st, sc.title)) : beforeBattle ? 'לפני קרב' : 'פרק חדש';
  db.checkpoints.unshift(makeEntry(st, label));
  db.checkpoints = db.checkpoints.slice(0, MAX_CHECKPOINTS);
}

function saveToSlot(st, i) {
  const db = readDB();
  db.slots[i] = makeEntry(st, `משבצת ${i + 1}`);
  return writeDB(db);
}

function deleteSlot(i) {
  const db = readDB();
  db.slots[i] = null;
  writeDB(db);
}

function clearAutoAndCheckpoints() {
  const db = readDB();
  db.auto = null;
  db.checkpoints = [];
  writeDB(db);
}

function loadEntry(entry) {
  return entry ? JSON.parse(JSON.stringify(entry.state)) : null;
}

// ---------- קוד שמירה ----------

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function exportCode(st) {
  const copy = JSON.parse(JSON.stringify(st));
  if (copy.battle) copy.battle.log = copy.battle.log.slice(-12);
  return 'ARENA1:' + toBase64(JSON.stringify(copy));
}

function importCode(code) {
  const clean = String(code || '').trim().replace(/\s+/g, '');
  const body = clean.startsWith('ARENA1:') ? clean.slice(7) : clean;
  const st = JSON.parse(fromBase64(body));
  if (!st || typeof st !== 'object' || !st.scene || !SCENES[st.scene] || !st.stats) throw new Error('קוד לא תקין');
  return st;
}

function timeAgo(t) {
  const sec = Math.round((Date.now() - t) / 1000);
  if (sec < 60) return 'עכשיו';
  const min = Math.round(sec / 60);
  if (min < 60) return `לפני ${min} דק׳`;
  const h = Math.round(min / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = new Date(t);
  return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
