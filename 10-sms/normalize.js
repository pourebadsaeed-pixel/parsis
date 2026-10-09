const DIGIT_MAP = {
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'
};

export const toEnglishDigits = (s='') =>
  String(s).replace(/[۰-۹٠-٩]/g, d => DIGIT_MAP[d] ?? d);

export function normalizeText(s='') {
  return toEnglishDigits(s)
    .replace(/[\u200c\u200e\u200f]/g, ' ')
    .replace(/[يى]/g,'ی').replace(/[ك]/g,'ک')
    .replace(/[،,]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

export const toAmount = (s='') => {
  const n = Number(toEnglishDigits(String(s)).replace(/[^\d]/g,''));
  return Number.isFinite(n) ? n : 0;
};
