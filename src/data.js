export const RAW = [
  ["목(木)","화(火)","토(土)","금(金)","수(水)"],
  ["갑(甲) 을(乙)","병(丙) 정(丁)","무(戊) 기(己)","경(庚) 신(辛)","임(壬) 계(癸)"],
  ["인(寅) 묘(卯)","사(巳) 오(午)","진(辰) 술(戌) 축(丑) 미(未)","신(申) 유(酉)","해(亥) 자(子)"],
  ["풍(風)","서(暑)","습(濕)","조(燥)","한(寒)"],
  ["간(肝)","심(心)","비(脾)","폐(肺)","신(腎)"],
  ["담(膽) 소장(小腸)","소장(小腸) 위(胃)","위(胃) 대장(大腸)","대장(大腸) 방광(膀胱)","방광(膀胱)"],
  ["목(目)","설(舌)","구(口)","비(鼻)","이(耳)"],
  ["노(怒)","희(喜)","사(思)","우(憂)","공(恐)"],
  ["인(仁)","예(禮)","신(信)","의(義)","지(智)"],
  ["산(酸)","고(苦)","감(甘)","신(辛)","함(鹹)"],
  ["청(靑)","적(赤)","황(黃)","백(白)","흑(黑)"],
  ["각(角)","치(徵)","궁(宮)","상(商)","우(羽)"],
  ["생(生)","장(長)","화(化)","수(收)","장(藏)"],
  ["근(筋)","맥(脈)","육(肉)","피(皮)","골(骨)"],
  ["조(爪)","면(面)","순(脣)","모(毛)","발(髮)"],
];

export const CATS = ["오행","천간","지지","오기","오장","육부","오관","오지","오상","오미","오색","오음","오화","오체","외화"];
export const OHAENG = RAW[0];

function parsePairs(str) {
  const r = [], re = /([가-힣]+)\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(str)) !== null) r.push({ eum: m[1], hanja: m[2] });
  return r;
}

export function buildHanjaCards() {
  const seen = new Set(), cards = [];
  RAW.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      parsePairs(cell).forEach(({ eum, hanja }) => {
        if (!seen.has(hanja)) {
          seen.add(hanja);
          cards.push({ id: 'h-' + hanja, type: 'hanja', hanja, eum, cat: CATS[ri], ohaeng: OHAENG[ci] });
        }
      });
    });
  });
  return cards;
}

export function buildRowCards() {
  return RAW.map((row, ri) => ({ id: 'r-' + ri, type: 'row', cat: CATS[ri], items: row }));
}
