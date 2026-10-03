/**
 * Arabic Tashkeel Normalization & Root Extraction Utility
 * Handles diacritics removal, letter unification (Alif, Taa Marbuta, Alif Maqsura),
 * and 3-letter radical (ف-ع-ل) root extraction.
 */

/**
 * Strips all vowel diacritics (Harakat / Tashkeel / Shaddah / Tanween / Sukoon)
 */
export function cleanTashkeel(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .trim();
}

/**
 * Strips harakat and unifies letter variants (Alif variants, Taa Marbuta, Alif Maqsura)
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // remove harakat
    .replace(/[إأآاٱ]/g, 'ا')                           // unify alif variants
    .replace(/ة/g, 'ه')                               // unify taa marbuta
    .replace(/ى/g, 'ي')                               // unify alif maqsura
    .trim();
}

/**
 * Heuristic 3-letter root extraction from an Arabic word.
 * Strips common verbal/nominal affixes (prefixes: ال, و, ف, ب, ل, ك, ي, ت, ن, أ, ا, است, etc.
 * and suffixes: ون, ين, ات, ان, وا, نا, ها, هم, كم, تم, ت, ي)
 */
export function extractProbableRoot(text: string): string[] {
  let cleaned = normalizeArabic(text);

  // Strip leading negative particles / words (لا, ما, لم, لن)
  cleaned = cleaned.replace(/^(لا|ما|لم|لن)\s+/, '').trim();

  // Remove common definite article
  if (cleaned.startsWith('ال') && cleaned.length > 4) {
    cleaned = cleaned.slice(2);
  }

  // Remove prefixed conjunctions/prepositions (و, ف, ب, ل, ك)
  if (cleaned.length > 4 && /^[وفبلك]/.test(cleaned)) {
    cleaned = cleaned.slice(1);
  }

  // Remove definite article again if it appeared after preposition (e.g. بالـ)
  if (cleaned.startsWith('ال') && cleaned.length > 4) {
    cleaned = cleaned.slice(2);
  }

  // Handle Form X (استفعل / يستفعل / تستفعل) prefix: است / يست / تست / نست
  if (/^[يستن]?ست/.test(cleaned) && cleaned.length >= 5) {
    cleaned = cleaned.replace(/^[يستن]?ست/, '');
  }

  // Handle Form VII (انفعل) prefix: ان
  if (cleaned.startsWith('ان') && cleaned.length >= 5) {
    cleaned = cleaned.slice(2);
  }

  // Strip common suffixes: ون, ين, ات, ان, وا, نا, ها, هم, هن, كم, تم, ت, ي, ه
  cleaned = cleaned
    .replace(/(ون|ين|ات|ان|وا|نا|ها|هم|هن|كم|تم)$/, '')
    .replace(/[تيه]$/, '');

  // Handle Noun patterns with Meem prefix (مفعل, مفعول, مفعال, مفعلة)
  if (cleaned.length === 5 && cleaned.startsWith('م') && cleaned[3] === 'و') {
    // مفعول e.g. منصور -> نصر
    cleaned = cleaned.slice(1, 3) + cleaned.slice(4);
  } else if (cleaned.length === 5 && cleaned.startsWith('م') && cleaned[3] === 'ا') {
    // مفعال e.g. منصار, مفتاح -> نصر, فتح
    cleaned = cleaned.slice(1, 3) + cleaned.slice(4);
  } else if (cleaned.length === 5 && cleaned.startsWith('م') && (cleaned.endsWith('ه') || cleaned.endsWith('ة'))) {
    // مفعلة e.g. منصره, مكنسه -> نصر, كنس
    cleaned = cleaned.slice(1, 4);
  } else if (cleaned.length === 4 && cleaned.startsWith('م') && !cleaned.startsWith('ما')) {
    // مفعل / مفعل e.g. منصر, مبرد, مسجد, مكتب -> نصر, برد, سجد, كتب
    cleaned = cleaned.slice(1);
  }

  // Strip common verbal prefixes (Mudaria / Form IV: ي, ت, ن, ا, أ) if word length still > 3
  if (cleaned.length > 3 && /^[يتناأ]/.test(cleaned)) {
    cleaned = cleaned.slice(1);
  }

  // Handle Form III (فاعل): e.g., قاتل -> قتل (remove middle alif if 4-letter Form III verb)
  if (cleaned.length === 4 && cleaned[1] === 'ا') {
    cleaned = cleaned[0] + cleaned.slice(2);
  }

  // Handle Fa'eel pattern (فعيل): e.g. شريف -> شرف, كريم -> كرم
  if (cleaned.length === 4 && cleaned[2] === 'ي' && !cleaned.startsWith('ي') && !cleaned.startsWith('ت')) {
    cleaned = cleaned[0] + cleaned[1] + cleaned[3];
  }

  // Handle Form VIII (افتعل): remove infix ت if present (e.g. اكتسب -> كسب)
  if (cleaned.length === 4 && cleaned[1] === 'ت') {
    cleaned = cleaned[0] + cleaned.slice(2);
  }

  // Keep only primary letters, fallback to first 3 characters if length >= 3
  const letters = cleaned.split('').filter((c) => /[\u0600-\u06FF]/.test(c));

  if (letters.length >= 3) {
    return letters.slice(0, 3);
  }

  // If word is short (e.g. 2 letters like قل), return what exists
  return letters.slice(0, 3);
}

/**
 * Checks if two Arabic words match, ignoring Harakat and letter shape variations
 */
export function areArabicWordsEqual(wordA: string, wordB: string): boolean {
  return normalizeArabic(wordA) === normalizeArabic(wordB);
}
