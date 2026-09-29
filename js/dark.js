// אבדות: סצנת האבל אחרי מוות של חבר, מילים אחרונות, ומותות שנקבעים בסיפור.

const LAST_WORDS = {
  noa: 'תבטיח{|י} לי שתחזור{|י} הביתה. ותגיד{|י} לאמא שלי... שציירתי דרקונים עד הסוף.',
  itay: 'תגיד{|י} לאבא שלי שלא פחדתי. זה שקר. אבל תגיד{|י} לו.',
  maya: 'חישבתי את הסיכויים... הם היו טובים. הם היו ממש טובים.',
  daniel: 'היי... אל תעשה{|י} פרצוף כזה. זה בסך הכול... עוד תעלול שלא הצליח.',
  kira: 'תספר{|י} לי... איך זה שם, מתחת לעננים. תספר{|י} לי שיש שם ים.',
  borg: 'חברים.',
  yoav: 'סליחה. על הכול. על הארון בכיתה ז׳. על הכול.',
  alon: 'תגיד{|י} לשירה... שמצאתי את הדרך הביתה. שזה לא כואב.',
  ziv: 'בפעם הראשונה בחיים... לא הייתי מספיק מהיר.',
  iris: 'תרימו אותי... אני רוצה לראות את השמיים. פעם אחרונה.',
  rena: 'לפחות... אני מתה בצורה שלי.',
  goren: 'החול זוכר. עכשיו הוא יזכור גם אותי.',
  grom: 'לא רע... בשביל טירון. תחרוט{|י} לי קו. עם עיגול בסוף.',
};

function deathLine(s, id) {
  const c = COMPANIONS[id];
  const he = c.f ? 'היא' : 'הוא';
  if (id === 'noa' && has(s, 'noaSacrifice') && s.flags.lastFallen && s.flags.lastFallen.includes('noa') && !has(s, 'noaMourned')) {
    return `{אתה כבר היית|את כבר היית} בחושך. ואז הרגשת ידיים חמות על החזה, ואור ירוק שנכנס לתוכך כמו מים חמים.

כש{פתחת|פתחת} את העיניים, נועה שכבה לידך על החול. האור שלה כבה. היא נתנה לך את כל מה שהיה לה — לא רק את הכוח. את הכול.

"${LAST_WORDS.noa}" היא הספיקה ללחוש, לפני שהיד שלה נשמטה מהיד שלך.`;
  }
  return `${c.name} שוכב${c.f ? 'ת' : ''} על החול, ו{אתה כורע|את כורעת} ${c.f ? 'לידה' : 'לידו'}. הדם לא מפסיק. הקהל כבר מריע למשהו אחר.

"${LAST_WORDS[id]}" ${he} ${c.f ? 'לוחשת' : 'לוחש'}.

ואז ${he} כבר לא ${c.f ? 'נושמת' : 'נושם'}.`;
}

function memorialChoices(next) {
  const go = (s) => {
    const n = typeof next === 'function' ? next(s) : next || s.pendingNext || 'season_end';
    s.pendingNext = null;
    if ((s.flags.lastFallen || []).includes('noa')) setFlag(s, 'noaMourned');
    s.flags.lastFallen = [];
    return n;
  };
  return [
    {
      text: 'לקבור בחול הזירה, ולהישבע שזה לא יקרה שוב',
      effect: (s) => { addStat(s, 'spirit', 1); trustTeam(s, 1); },
      next: go,
    },
    {
      text: 'לחרוט את השם על קיר הצריף, ליד שלושים ושבעה העיגולים',
      effect: (s) => { addStat(s, 'influence', 1); setFlag(s, 'memorialWall'); },
      next: go,
    },
    {
      text: 'לא לבכות. להפוך את הכאב לזעם',
      effect: (s) => { addStat(s, 'power', 1); powerUp(s, 1); trustTeam(s, -1); },
      next: go,
    },
  ];
}

scene('grief', {
  title: 'אבדה',
  dark: true,
  chapter: (s) => {
    const n = SCENES[s.pendingNext];
    return n ? (typeof n.chapter === 'function' ? n.chapter(s) : n.chapter) : '';
  },
  text: (s) => {
    const ids = s.flags.lastFallen || [];
    if (!ids.length) return 'השקט אחרי הקרב כבד מכל רעש.';
    const parts = ids.map((id) => deathLine(s, id));
    const left = teamIds(s);
    return `${parts.join('\n\n')}

${left.length ? `${names(left)} עומדים סביבך בשתיקה. אף אחד לא יודע מה להגיד. בזירה הזאת, אף פעם אין מה להגיד.` : '{אתה נשאר|את נשארת} לבד על החול. לגמרי לבד.'}

בלילה, על קיר הצריף, מישהו חורט קו אחד. קטן. ישר. בלי עיגול בסוף.`;
  },
  choices: memorialChoices(),
});

// ---------- מוות של איתי מאבק הזהב (בין עונה 2 ל-3) ----------

scene('s3_itay', {
  title: 'אבק',
  dark: true,
  chapter: 'עונה 3 — הגמר הגדול',
  enter: (s) => { setStatus(s, 'itay', 'dead'); setFlag(s, 'itayDustDeath'); },
  text: (s) => `בבוקר שאחרי ליל הירח הכפול, עגלה של בית ורקס נעצרת מול הצריף שלכם. שני משרתים זורקים על החול משהו עטוף בבד משי, ונוסעים בלי מילה.

זה איתי.

העור שלו עדיין זוהר זהוב, אבל מתחת לזהב הוא אפור ודק, כמו נייר. ורקס האכיל אותו אבק עד שלא נשאר ממנו כלום. "ניצול יתר," כתוב על פתק שמוצמד לבד. "הבית מביע צער."

${has(s, 'itayConfession') ? '{אתה נזכר|את נזכרת} בלילה הראשון. "אם מישהו יציע לי דרך החוצה — אני לוקח אותה." זו הייתה הדרך החוצה.' : '{אתה נזכר|את נזכרת} בקפטן של נבחרת הכדורגל, רועש ובטוח בעצמו, בשורה האחרונה של הכיתה.'}

${soldIds(s).length ? `${names(soldIds(s))} עדיין שם, בבית ורקס. עם אותה קערה של אבק ליד המיטה.` : ''}`,
  choices: memorialChoices('s3a_start'),
});

function nextSeason3(s) {
  return isSold(s, 'itay') && !has(s, 'itayFreed') ? 's3_itay' : 's3a_start';
}

// מי נופל ראשון כשמשהו משתבש מחוץ לזירה (לא נועה, אלא אם אין ברירה)
function pickVictim(s, prefer) {
  const team = teamIds(s);
  if (!team.length) return null;
  const order = prefer || ['borg', 'kira', 'goren', 'ziv', 'iris', 'rena', 'yoav', 'alon', 'daniel', 'maya', 'itay', 'noa'];
  return order.find((id) => team.includes(id)) || team[0];
}
