import { TahqeeqData } from './types';
import { cleanTashkeel, normalizeArabic, extractProbableRoot } from './utils/arabicAnalyzer';
import { analyzeSarfDeterministic } from './utils/sarfEngine';

// Re-export helpers for application-wide consistency
export { cleanTashkeel, normalizeArabic, extractProbableRoot, analyzeSarfDeterministic };

// Comprehensive authentic Darse Nizami dictionary covering all fundamental Bahaths, Baabs, Haft Qism & Derived Nouns
export const PRELOADED_WORDS: Record<string, TahqeeqData> = {
  // 1. থ্রি-লেটার বেঞ্চমার্ক
  'نَصَرَ': {
    word: 'نَصَرَ',
    phonetic: '(Nasara)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'ওয়াহিদ মুযাক্কার গায়েব',
    seegahAr: 'وَاحِد مُذَكَّر غَائِب',
    bahath: "ইসবাত ফে'লে মাযী মারূফ",
    bahathAr: 'فِعْل مَاضٍ مَعْرُوف',
    baab: 'বাব নাসারা-ইয়ানসুরু',
    baabAr: 'بَابُ نَصَرَ - يَنْصُرُ',
    masdar: 'النَّصْرُ (সাহায্য করা)',
    masdarMeaning: 'সাহায্য করা',
    maddah: 'ن - ص - ر (নূন-ছদ-র)',
    maddahAr: 'ن - ص - ر',
    rootLetters: ['ن', 'ص', 'ر'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ত্রুটিমুক্ত মূলবর্ণ',
    meaning: 'সে একজন পুরুষ সাহায্য করল',
    meaningEn: 'He helped (one male)'
  },
  // 2. মাযী মাজহুল (Passive Past)
  'نُصِرَ': {
    word: 'نُصِرَ',
    phonetic: '(Nusira)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'ওয়াহিদ মুযাক্কার গায়েব',
    seegahAr: 'وَاحِد مُذَكَّر غَائِب',
    bahath: "ইসবাত ফে'লে মাযী মাজহুল",
    bahathAr: 'فِعْل مَاضٍ مَجْهُول',
    baab: 'বাব নাসারা-ইয়ানসুরু',
    baabAr: 'بَابُ نَصَرَ - يَنْصُرُ',
    masdar: 'النَّصْرُ (সাহায্য করা)',
    masdarMeaning: 'সাহায্য করা',
    maddah: 'ن - ص - ر (নূন-ছদ-র)',
    maddahAr: 'ن - ص - ر',
    rootLetters: ['ن', 'ص', 'ر'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ত্রুটিমুক্ত মূলবর্ণ',
    meaning: 'তাকে (এক পুরুষকে) সাহায্য করা হলো',
    meaningEn: 'He was helped'
  },
  // 3. লামে তাকীদ বা নূনে তাকীদে সাকীলাহ (Emphatic Future)
  'لَيَنْصُرَنَّ': {
    word: 'لَيَنْصُرَنَّ',
    phonetic: '(La-yansuranna)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'ওয়াহিদ মুযাক্কার গায়েব',
    seegahAr: 'وَاحِد مُذَكَّر غَائِب',
    bahath: 'লামে তাকীদ বা নূনে তাকীদে সাকীলাহ মারূফ',
    bahathAr: 'لَامُ تَأْكِيد بِنُونِ تَأْكِيد ثَقِيلَة مَعْرُوف',
    baab: 'বাব নাসারা-ইয়ানসুরু',
    baabAr: 'بَابُ نَصَرَ - يَنْصُرُ',
    masdar: 'النَّصْرُ (সাহায্য করা)',
    masdarMeaning: 'সাহায্য করা',
    maddah: 'ن - ص - ر (নূন-ছদ-র)',
    maddahAr: 'ن - ص - ر',
    rootLetters: ['ن', 'ص', 'ر'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ত্রুটিমুক্ত মূলবর্ণ',
    meaning: 'সে অবশ্যই একজন পুরুষ সাহায্য করবে',
    meaningEn: 'He will definitely help (singular male)'
  },
  // 4. মাযী এস্তেমরারী (Past Continuous / Habitual)
  'كَانَ يَنْصُرُ': {
    word: 'كَانَ يَنْصُرُ',
    phonetic: '(Kaana Yansuru)',
    wordType: "ফে'ল (যৌগিক ক্রিয়া / فِعْل مُرَكَّب)",
    seegah: 'ওয়াহিদ মুযাক্কার গায়েব',
    seegahAr: 'وَاحِد مُذَكَّر غَائِب',
    seegahEn: 'Singular Masculine 3rd Person',
    bahath: 'ইসবাত ফে\'লে মাযী এস্তেমরারী মারূফ',
    bahathAr: 'إِثْبَات فِعْل مَاضٍ اسْتِمْرَارِي مَعْرُوف',
    bahathEn: 'Affirmative Past Continuous Active',
    baab: 'বাব নাসারা-ইয়ানসুরু (মূল ফে\'ল يَنْصُرُ অনুযায়ী)',
    baabAr: 'بَابُ نَصَرَ - يَنْصُرُ',
    baabEn: 'Bab Nasara - Yansuru (based on core verb)',
    masdar: 'النَّصْرُ (সাহায্য করা)',
    masdarMeaning: 'সাহায্য করা',
    masdarMeaningEn: 'To help / assist',
    maddah: 'ن - ص - ر (নূন-ছদ-র)',
    maddahAr: 'ن - ص - ر',
    maddahEn: 'N - S - R',
    rootLetters: ['ن', 'ص', 'ر'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ছহীহ (মূল বর্ণে হরফে ইল্লাত, হামযাহ ও তাশদীদ নেই)',
    jinsEn: 'Sahih (Sound)',
    jinsTypeEn: 'Sound verbal root free from defective letters',
    meaning: 'সে সাহায্য করত (অতীতকালের ধারাবাহিক অভ্যাস)',
    meaningEn: 'He used to help / was helping',
    meaningAr: 'كَانَ يَقُومُ بِمُسَاعَدَةِ غَيْرِهِ بَاسْتِمْرَار',
    tarkeebNote: 'كَانَ হলো ফে\'লে নাক্বিস (فعل ناقص), এর মধ্যকার লুকায়িত (مُسْتَتِر) যমীর هُوَ হলো তার ইসিম (اسم كان), এবং يَنْصُرُ ফে\'ল ও ফায়েল মিলে জুমলা ফে\'লিয়া হয়ে كَانَ-এর খবর (خبر كان)। كَانَ তার ইসিম ও খবর নিয়ে জুমলা ফে\'লিয়া নাকেসাহ।',
    tarkeebNoteAr: 'كَانَ: فعل ماضٍ ناقص واسمه ضمير مستتر تقديره هو، وجملة (يَنْصُرُ) الفعلية في محل نصب خبر كان.',
    tarkeebNoteEn: 'كَانَ is an auxiliary/incomplete verb whose implicit pronoun (هُوَ) is its subject (اسم كان). The verbal clause (يَنْصُرُ) acts as the predicate (خبر كان).'
  },
  // 5. মাযী বাঈদ (Past Remote / Past Perfect)
  'كَانَ نَصَرَ': {
    word: 'كَانَ نَصَرَ',
    phonetic: '(Kaana Nasara)',
    wordType: "ফে'ল (যৌগিক ক্রিয়া / فِعْل مُرَكَّب)",
    seegah: 'ওয়াহিদ মুযাক্কার গায়েব',
    seegahAr: 'وَاحِد مُذَكَّر غَائِب',
    seegahEn: 'Singular Masculine 3rd Person',
    bahath: 'ইসবাত ফে\'লে মাযী বাঈদ মারূফ',
    bahathAr: 'إِثْبَات فِعْل مَاضٍ بَعِيد مَعْرُوف',
    bahathEn: 'Affirmative Past Perfect Active',
    baab: 'বাব নাসারা-ইয়ানসুরু',
    baabAr: 'بَابُ نَصَرَ - يَنْصُرُ',
    masdar: 'النَّصْرُ (সাহায্য করা)',
    masdarMeaning: 'সাহায্য করা',
    maddah: 'ن - ص - ر (নূন-ছদ-র)',
    maddahAr: 'ن - ص - ر',
    rootLetters: ['ن', 'ص', 'ر'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ত্রুটিমুক্ত মূলবর্ণ',
    meaning: 'সে পূর্বে সাহায্য করেছিল',
    meaningEn: 'He had helped',
    tarkeebNote: 'كَانَ ফে\'লে নাক্বিস, ভেতরে هُوَ হলো ইসিম, এবং نَصَرَ ফে\'ল-ফায়েল মিলে জুমলা ফে\'লিয়া হয়ে كَانَ-এর খবর।'
  },
  // 6. মাযী ক্বরীব (Past Near / Present Perfect)
  'قَدْ نَصَرَ': {
    word: 'قَدْ نَصَرَ',
    phonetic: '(Qad Nasara)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'ওয়াহিদ মুযাক্কার গায়েব',
    seegahAr: 'وَاحِد مُذَكَّر غَائِب',
    seegahEn: 'Singular Masculine 3rd Person',
    bahath: 'ইসবাত ফে\'লে মাযী ক্বরীব মারূফ',
    bahathAr: 'إِثْبَات فِعْل مَاضٍ قَرِيب مَعْرُوف',
    bahathEn: 'Affirmative Past Near Active',
    baab: 'বাব নাসারা-ইয়ানসুরু',
    baabAr: 'بَابُ نَصَرَ - يَنْصُرُ',
    masdar: 'النَّصْرُ (সাহায্য করা)',
    masdarMeaning: 'সাহায্য করা',
    maddah: 'ن - ص - ر (নূন-ছদ-র)',
    maddahAr: 'ن - ص - ر',
    rootLetters: ['ن', 'ص', 'ر'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ত্রুটিমুক্ত মূলবর্ণ',
    meaning: 'সে এইমাত্র সাহায্য করেছে / সাহায্য করেছে',
    meaningEn: 'He has helped',
    tarkeebNote: 'قَدْ হলো হরফে তাহকীক ও তাকরীব (حرف تحقيق وتقريب), আর نَصَرَ হলো ফে\'লে মাযী মারূফ।'
  },
  // 7. ইসমে আলাহ সুগরা (Ism Alah Sughra)
  'مِنْصَرٌ': {
    word: 'مِنْصَرٌ',
    phonetic: '(Minsarun)',
    wordType: 'ইসমে আলাহ (اسم الآلة - বিশেষ্য)',
    seegah: 'ওয়াহিদ মুযাক্কার',
    seegahAr: 'وَاحِد مُذَكَّر',
    seegahEn: 'Singular Masculine',
    bahath: 'ইসমে আলাহ সুগরা',
    bahathAr: 'اسْمُ الآلَةِ (صُغْرَى)',
    bahathEn: 'Noun of Instrument (Minor)',
    baab: 'বাব নাসারা-ইয়ানসুরু',
    baabAr: 'بَابُ نَصَرَ - يَنْصُرُ',
    baabEn: 'Bab Nasara - Yansuru',
    masdar: 'النَّصْرُ (সাহায্য করা)',
    masdarMeaning: 'সাহায্য করা',
    masdarMeaningEn: 'To help / assist',
    maddah: 'ن - ص - ر (নূন-ছদ-র)',
    maddahAr: 'ن - ص - ر',
    maddahEn: 'N - S - R',
    rootLetters: ['ن', 'ص', 'ر'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ছহীহ (ত্রুটিমুক্ত মূলবর্ণ)',
    jinsEn: 'Sahih (Sound)',
    jinsTypeEn: 'Sound verbal root free from defective letters',
    meaning: 'সাহায্য করার ছোট যন্ত্র বা মাধ্যম',
    meaningEn: 'A small instrument or tool for helping',
    meaningAr: 'آلَةٌ أَوْ أَدَاةٌ صَغِيرَةٌ لِلْمُعَاوَنَةِ وَالنَّصْرِ',
    tarkeebNote: 'مِنْصَرٌ এটি ইসমে আলাহ (সুগরা, مِفْعَل ওজনে), যা মূলধাতু نَصَرَ-يَنْصُرُ থেকে গঠিত। বাক্যে এটি ইসমে যাত (مبتدأ, فاعل বা مفعول) হিসেবে ব্যবহৃত হয়।',
    tarkeebNoteAr: 'مِنْصَرٌ: اسم آلة (صغرى) على وزن مِفْعَل مشتق من نصر، يعرب بحسب موقعه في الجملة.',
    tarkeebNoteEn: 'مِنْصَرٌ is an Ism Alah (minor noun of instrument on pattern مِفْعَل). Syntactically, it acts as a concrete noun based on sentence position.'
  },
  'منصر': {
    word: 'مِنْصَرٌ',
    phonetic: '(Minsarun)',
    wordType: 'ইসমে আলাহ (اسم الآلة - বিশেষ্য)',
    seegah: 'ওয়াহিদ মুযাক্কার',
    seegahAr: 'وَاحِد مُذَكَّر',
    seegahEn: 'Singular Masculine',
    bahath: 'ইসমে আলাহ সুগরা',
    bahathAr: 'اسْمُ الآلَةِ (صُغْرَى)',
    bahathEn: 'Noun of Instrument (Minor)',
    baab: 'বাব নাসারা-ইয়ানসুরু',
    baabAr: 'بَابُ نَصَرَ - يَنْصُرُ',
    baabEn: 'Bab Nasara - Yansuru',
    masdar: 'النَّصْرُ (সাহায্য করা)',
    masdarMeaning: 'সাহায্য করা',
    masdarMeaningEn: 'To help / assist',
    maddah: 'ن - ص - ر (নূন-ছদ-র)',
    maddahAr: 'ن - ص - ر',
    maddahEn: 'N - S - R',
    rootLetters: ['ن', 'ص', 'ر'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ছহীহ (ত্রুটিমুক্ত মূলবর্ণ)',
    jinsEn: 'Sahih (Sound)',
    jinsTypeEn: 'Sound verbal root free from defective letters',
    meaning: 'সাহায্য করার ছোট যন্ত্র বা মাধ্যম',
    meaningEn: 'A small instrument or tool for helping',
    meaningAr: 'آلَةٌ أَوْ أَدَاةٌ صَغِيرَةٌ لِلْمُعَاوَنَةِ وَالنَّصْرِ',
    tarkeebNote: 'مِنْصَرٌ এটি ইসমে আলাহ (সুগরা, مِفْعَل ওজনে), যা মূলধাতু نَصَرَ-يَنْصُرُ থেকে গঠিত। বাক্যে এটি ইসমে যাত (مبتدأ, فاعل বা مفعول) হিসেবে ব্যবহৃত হয়।',
    tarkeebNoteAr: 'مِنْصَرٌ: اسم آلة (صغرى) على وزن مِفْعَل مشتق من نصر، يعرب بحسب موقعه في الجملة.',
    tarkeebNoteEn: 'مِنْصَرٌ is an Ism Alah (minor noun of instrument on pattern مِفْعَل). Syntactically, it acts as a concrete noun based on sentence position.'
  },
  // 8. ছিফাতে মুশাব্বাহাহ (Adjective of Permanent Attribute)
  'شَرِيفٌ': {
    word: 'شَرِيفٌ',
    phonetic: '(Sharīfun)',
    wordType: 'ইসমে ছিফাত (الصِّفَةُ المُشَبَّهَةُ - বিশেষ্য)',
    seegah: 'ওয়াহিদ মুযাক্কার',
    seegahAr: 'مُفْرَدٌ مُذَكَّرٌ',
    seegahEn: 'Singular Masculine',
    bahath: 'ছিফাতে মুশাব্বাহাহ',
    bahathAr: 'الصِّفَةُ المُشَبَّهَةُ',
    bahathEn: 'Adjective of Permanent Attribute',
    baab: 'বাব কারুমা-ইয়াকুরুমু',
    baabAr: 'بَابُ كَرُمَ - يَكْرُمُ',
    baabEn: 'Bab Karuma - Yakrumu',
    masdar: 'الشَّرَفُ (উচ্চমর্যাদাশীল হওয়া)',
    masdarMeaning: 'উচ্চমর্যাদাশীল হওয়া / সম্মান লাভ করা',
    masdarMeaningEn: 'Nobility / to be noble',
    maddah: 'ش - ر - ف (শীন-র-ফা)',
    maddahAr: 'ش - ر - ف',
    maddahEn: 'Sh - R - F',
    rootLetters: ['ش', 'ر', 'ف'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ছহীহ (ত্রুটিমুক্ত মূলবর্ণ)',
    jinsEn: 'Sahih (Sound)',
    jinsTypeEn: 'Sound root free from defective letters',
    meaning: 'উচ্চমর্যাদাশীল বা সম্মানিত',
    meaningEn: 'Noble, honorable, distinguished',
    meaningAr: 'ذُو شَرَفٍ وَمَكَانَةٍ عَالِيَةٍ وَرِفْعَة',
    tarkeebNote: 'شَرِيفٌ হলো ছিফাতে মুশাব্বাহাহ (فَعِيل ওজনে), যা স্থায়ী গুণ নির্দেশ করে। ব্যাকরণে এটি ফে\'লে লাযিমের আমল করে এবং বাক্যে সাধারণত মওসুফের ছিফাত (نعت), খবর (خبر) অথবা হাল (حال) হিসেবে ব্যবহৃত হয়।',
    tarkeebNoteAr: 'شَرِيفٌ: صفة مشبهة باسم الفاعل على وزن فَعِيل تدل على الثبوت، تعرب نعتاً أو خبراً أو حالاً بحسب موقعها في السياق.',
    tarkeebNoteEn: 'شَرِيفٌ is a Sifah Mushabbahah (attributive adjective on pattern فَعِيل) denoting permanent quality. Syntactically functions as an adjective (Naat), predicate (Khabar), or state (Haal).'
  },
  'شريف': {
    word: 'شَرِيفٌ',
    phonetic: '(Sharīfun)',
    wordType: 'ইসমে ছিফাত (الصِّفَةُ المُشَبَّهَةُ - বিশেষ্য)',
    seegah: 'ওয়াহিদ মুযাক্কার',
    seegahAr: 'مُفْرَدٌ مُذَكَّرٌ',
    seegahEn: 'Singular Masculine',
    bahath: 'ছিফাতে মুশাব্বাহাহ',
    bahathAr: 'الصِّفَةُ المُشَبَّهَةُ',
    bahathEn: 'Adjective of Permanent Attribute',
    baab: 'বাব কারুমা-ইয়াকুরুমু',
    baabAr: 'بَابُ كَرُمَ - يَكْرُمُ',
    baabEn: 'Bab Karuma - Yakrumu',
    masdar: 'الشَّرَفُ (উচ্চমর্যাদাশীল হওয়া)',
    masdarMeaning: 'উচ্চমর্যাদাশীল হওয়া / সম্মান লাভ করা',
    masdarMeaningEn: 'Nobility / to be noble',
    maddah: 'ش - ر - ف (শীন-র-ফা)',
    maddahAr: 'ش - ر - ف',
    maddahEn: 'Sh - R - F',
    rootLetters: ['ش', 'ر', 'ف'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ছহীহ (ত্রুটিমুক্ত মূলবর্ণ)',
    jinsEn: 'Sahih (Sound)',
    jinsTypeEn: 'Sound root free from defective letters',
    meaning: 'উচ্চমর্যাদাশীল বা সম্মানিত',
    meaningEn: 'Noble, honorable, distinguished',
    meaningAr: 'ذُو شَرَفٍ وَمَكَانَةٍ عَالِيَةٍ وَرِفْعَة',
    tarkeebNote: 'شَرِيفٌ হলো ছিফাতে মুশাব্বাহাহ (فَعِيل ওজনে), যা স্থায়ী গুণ নির্দেশ করে। ব্যাকরণে এটি ফে\'লে লাযিমের আমল করে এবং বাক্যে সাধারণত মওসুফের ছিফাত (نعت), খবর (خبر) অথবা হাল (حال) হিসেবে ব্যবহৃত হয়।',
    tarkeebNoteAr: 'شَرِيفٌ: صفة مشبهة باسم الفاعل على وزن فَعِيل تدل على الثبوت، تعرب نعتاً أو خبراً أو حالاً بحسب موقعها في السياق.',
    tarkeebNoteEn: 'شَرِيفٌ is a Sifah Mushabbahah (attributive adjective on pattern فَعِيل) denoting permanent quality. Syntactically functions as an adjective (Naat), predicate (Khabar), or state (Haal).'
  },
  // 9. ফে'লে নাহী (Prohibition)
  'لَا تَقْنَطُوا': {
    word: 'لَا تَقْنَطُوا',
    phonetic: '(Laa Taqnatu)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'জমা মুযাক্কার হাযির',
    seegahAr: 'جَمْع مُذَكَّر حَاضِر',
    bahath: "ফে'লে নাহী হাযির মারূফ",
    bahathAr: 'فِعْل نَهْي حَاضِر مَعْرُوف',
    baab: 'বাব যারাবা-ইয়াযরিবু / বাব সামিআ',
    baabAr: 'بَابُ ضَرَبَ / سَمِعَ (قَنِطَ - يَقْنَطُ)',
    masdar: 'القُنُوطُ (হতাশ হওয়া)',
    masdarMeaning: 'নিরাশ বা হতাশ হওয়া',
    maddah: 'ق - ن - ط (কাফ-নূন-তোয়া)',
    maddahAr: 'ق - ن - ط',
    rootLetters: ['ق', 'ن', 'ط'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ত্রুটিমুক্ত মূলবর্ণ',
    meaning: 'তোমরা নিরাশ বা হতাশ হইয়ো না',
    meaningEn: 'Do not despair'
  },
  // 4. মুদা'আফ (Doubled Root)
  'مَدَّ': {
    word: 'مَدَّ',
    phonetic: '(Madda)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'ওয়াহিদ মুযাক্কার গায়েব',
    seegahAr: 'وَاحِد مُذَكَّر غَائِب',
    bahath: "ইসবাত ফে'লে মাযী মারূফ",
    bahathAr: 'فِعْل مَاضٍ مَعْرُوف',
    baab: 'বাব নাসারা-ইয়ানসুরু',
    baabAr: 'بَابُ نَصَرَ - يَنْصُرُ (مَدَّ - يَمُدُّ)',
    masdar: 'المَدُّ (প্রসারিত করা / বাড়িয়ে দেওয়া)',
    masdarMeaning: 'টেনে লম্বা করা / অবকাশ দেওয়া',
    maddah: 'م - د - د (মীম-দাল-দাল)',
    maddahAr: 'م - د - د',
    rootLetters: ['م', 'د', 'د'],
    jins: 'মুদাআফ (مُضَاعَف)',
    jinsType: 'আইন ও লাম কলমা অভিন্ন হরফ',
    meaning: 'সে একজন পুরুষ প্রসারিত করল বা অবকাশ দিল',
    meaningEn: 'He extended / stretched'
  },
  // 5. মাহমূয (Hamzated Verb)
  'قَرَأَ': {
    word: 'قَرَأَ',
    phonetic: '(Qara-a)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'ওয়াহিদ মুযাক্কার গায়েব',
    seegahAr: 'وَاحِد مُذَكَّر غَائِب',
    bahath: "ইসবাত ফে'লে মাযী মারূফ",
    bahathAr: 'فِعْل مَاضٍ مَعْرُوف',
    baab: 'বাব ফাতাহা-ইয়াফতাহু',
    baabAr: 'بَابُ فَتَحَ - يَفْتَحُ (قَرَأَ - يَقْرَأُ)',
    masdar: 'القِرَاءَةُ (পড়া / তিলাওয়াত করা)',
    masdarMeaning: 'পাঠ করা / তিলাওয়াত করা',
    maddah: 'ق - ر - أ (কাফ-র-হামযাহ)',
    maddahAr: 'ق - ر - أ',
    rootLetters: ['ق', 'ر', 'أ'],
    jins: 'মাহমূযুল লাম (مَهْمُوز اللَّام)',
    jinsType: 'শেষ মূলবর্ণে হামযাহ',
    meaning: 'সে একজন পুরুষ পড়ল বা পাঠ করল',
    meaningEn: 'He read / recited'
  },
  // 6. বাব ফাতাহা-ইয়াফতাহু (Open / Grant)
  'فَتَحَ': {
    word: 'فَتَحَ',
    phonetic: '(Fataha)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'ওয়াহিদ মুযাক্কার গায়েব',
    seegahAr: 'وَاحِد مُذَكَّر غَائِب',
    bahath: "ইসবাত ফে'লে মাযী মারূফ",
    bahathAr: 'فِعْل مَاضٍ مَعْرُوف',
    baab: 'বাব ফাতাহা-ইয়াফতাহু',
    baabAr: 'بَابُ فَتَحَ - يَفْتَحُ (فَتَحَ - يَفْتَحُ)',
    masdar: 'الفَتْحُ (উন্মুক্ত করা / বিজয় দান করা)',
    masdarMeaning: 'খোলা / বিজয় অর্জন করা',
    maddah: 'ف - ت - ح (ফা-তা-হা)',
    maddahAr: 'ف - ت - ح',
    rootLetters: ['ف', 'ت', 'ح'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ত্রুটিমুক্ত মূলবর্ণ',
    meaning: 'সে একজন পুরুষ উন্মুক্ত করল বা বিজয় দিল',
    meaningEn: 'He opened / granted victory'
  },
  // 7. বাব ইফ'আল (Send Down / Honour)
  'أَنْزَلَ': {
    word: 'أَنْزَلَ',
    phonetic: '(Anzala)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'ওয়াহিদ মুযাক্কার গায়েব',
    seegahAr: 'وَاحِد مُذَكَّر غَائِب',
    bahath: "ইসবাত ফে'লে মাযী মারূফ",
    bahathAr: 'فِعْل مَاضٍ مَعْرُوف',
    baab: "বাব ইফ'আল",
    baabAr: 'بَابُ الإِفْعَالِ (أَنْزَلَ - يُنْزِلُ)',
    masdar: 'الإِنْزَالُ (নাযিল করা / অবতীর্ণ করা)',
    masdarMeaning: 'নাযিল করা বা নামিয়ে দেওয়া',
    maddah: 'ن - ز - ل (নূন-যা-লাম)',
    maddahAr: 'ن - ز - ل',
    rootLetters: ['ن', 'ز', 'ل'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ত্রুটিমুক্ত মূলবর্ণ',
    meaning: 'তিনি / সে একজন পুরুষ নাযিল করলেন বা অবতীর্ণ করলেন',
    meaningEn: 'He revealed / sent down'
  },
  // 8. লাফীফে মাফরূক্ব ও বাব ইফতি'আল (Protect / Fear Allah)
  'اتَّقُوا': {
    word: 'اتَّقُوا',
    phonetic: '(Ittaqoo)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'জমা মুযাক্কার হাযির',
    seegahAr: 'جَمْع مُذَكَّر حَاضِر',
    bahath: "ফে'লে আমর হাযির মারূফ",
    bahathAr: 'فِعْل أَمْر حَاضِر مَعْرُوف',
    baab: "বাব ইফতি'আল",
    baabAr: 'بَابُ الاِفْتِعَالِ (اتَّقَى - يَتَّقِي)',
    masdar: 'التَّقْوَى / الاِتِّقَاءُ (তাক্বওয়া / বেঁচে থাকা)',
    masdarMeaning: 'আল্লাহভীতি অবলম্বন করা / বেঁচে থাকা',
    maddah: 'و - ق - ي (ওয়াও-কাফ-ইয়া)',
    maddahAr: 'و - ق - ي',
    rootLetters: ['و', 'ق', 'ي'],
    jins: 'লাফীফে মাফরূক্ব (لَفِيف مَفْرُوق)',
    jinsType: 'প্রথম ও শেষ মূলবর্ণে হরফে ইল্লাত',
    meaning: 'তোমরা আল্লাহকে ভয় করো / তাকওয়া অবলম্বন করো',
    meaningEn: 'Fear Allah / be conscious of Allah'
  },
  // 9. আজওয়াফে ওয়াভী (Say / Speak)
  'يَقُولُونَ': {
    word: 'يَقُولُونَ',
    phonetic: "(Yaqooloona)",
    wordType: "ফে'ল (فِعْل)",
    seegah: 'জমা মুযাক্কার গায়েব',
    seegahAr: 'جَمْع مُذَكَّر غَائِب',
    bahath: "ইসবাত ফে'লে মুজারে মারূফ",
    bahathAr: 'فِعْل مُضَارِع مَعْرُوف',
    baab: 'বাব নাসারা-ইয়ানসুরু',
    baabAr: 'بَابُ نَصَرَ - يَنْصُرُ (قَالَ - يَقُولُ)',
    masdar: 'القَوْلُ (কথা বলা)',
    masdarMeaning: 'কথা বলা / ব্যক্ত করা',
    maddah: 'ق - و - ل (কাফ-ওয়াও-লাম)',
    maddahAr: 'ق - و - ل',
    rootLetters: ['ق', 'و', 'ل'],
    jins: 'আজওয়াফে ওয়াভী (أَجْوَف وَاوِي)',
    jinsType: 'মাঝের মূলবর্ণে ওয়াও (حرف علة)',
    meaning: 'তারা সকল পুরুষ বলে বা বলবে',
    meaningEn: 'They say / will say'
  },
  // 10. বাব যারাবা ও নাক্বিস (Guide us)
  'اِهْدِنَا': {
    word: 'اِهْدِنَا',
    phonetic: '(Ihdinaa)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'ওয়াহিদ মুযাক্কার হাযির',
    seegahAr: 'وَاحِد مُذَكَّر حَاضِر',
    bahath: "ফে'লে আমর হাযির মারূফ",
    bahathAr: 'فِعْل أَمْر حَاضِر مَعْرُوف',
    baab: 'বাব যারাবা-ইয়াযরিবু',
    baabAr: 'بَابُ ضَرَبَ - يَضْرِبُ (هَدَى - يَهْدِي)',
    masdar: 'الهِدَايَةُ (পথ দেখানো)',
    masdarMeaning: 'সঠিক পথ প্রদর্শন করা',
    maddah: 'هـ - د - ي (হা-দাল-ইয়া)',
    maddahAr: 'هـ - د - ي',
    rootLetters: ['ه', 'د', 'ي'],
    jins: 'নাক্বিসে ইয়ায়ী (نَاقِص يَائِي)',
    jinsType: 'শেষ মূলবর্ণে ইয়া',
    meaning: 'আপনি আমাদের সরল ও সঠিক পথ দেখান',
    meaningEn: 'Guide us (O Lord)'
  },
  // 11. বাব মুফা'আলাহ
  'قَاتَلُوا': {
    word: 'قَاتَلُوا',
    phonetic: '(Qootaloo)',
    wordType: "ফে'ল (فِعْل)",
    seegah: 'জমা মুযাক্কার গায়েব',
    seegahAr: 'جَمْع مُذَكَّر غَائِب',
    bahath: "ইসবাত ফে'লে মাযী মারূফ",
    bahathAr: 'فِعْل مَاضٍ مَعْرُوف',
    baab: "বাব মুফা'আলাহ",
    baabAr: 'بَابُ المُفَاعَلَةِ (قَاتَلَ - يُقَاتِلُ)',
    masdar: 'القِتَالُ / المُقَاتَلَةُ (যুদ্ধ করা)',
    masdarMeaning: 'যুদ্ধ করা / লড়াই করা',
    maddah: 'ق - ت - ل (কাফ-তা-লাম)',
    maddahAr: 'ق - ت - ل',
    rootLetters: ['ق', 'ت', 'ل'],
    jins: 'ছহীহ (صَحِيح)',
    jinsType: 'ত্রুটিমুক্ত মূলবর্ণ',
    meaning: 'তারা সকল পুরুষ যুদ্ধ বা লড়াই করল',
    meaningEn: 'They fought (males)'
  },
  // 12. ইসমে ফায়েল (Derived Noun)
  'مُؤْمِنُونَ': {
    word: 'مُؤْمِنُونَ',
    phonetic: "(Mu'minoona)",
    wordType: "ইসমে ফায়েল (اسْمُ الفَاعِلِ)",
    seegah: 'জমা মুযাক্কার',
    seegahAr: 'جَمْع مُذَكَّر',
    bahath: 'ইসমে ফায়েল',
    bahathAr: 'اسْمُ الفَاعِلِ',
    baab: "বাব ইফ'আল",
    baabAr: 'بَابُ الإِفْعَالِ (آمَنَ - يُؤْمِنُ)',
    masdar: 'الإِيمَانُ (ঈমান আনা / বিশ্বাস করা)',
    masdarMeaning: 'দৃঢ় বিশ্বাস স্থাপন করা',
    maddah: 'أ - م - ن (হামযাহ-মীম-নূন)',
    maddahAr: 'أ - م - ن',
    rootLetters: ['أ', 'م', 'ن'],
    jins: 'মাহমূযুল ফা (مَهْمُوز الفَاء)',
    jinsType: 'প্রথম মূলবর্ণে হামযাহ',
    meaning: 'সকল মুমিন বা বিশ্বাসী পুরুষ',
    meaningEn: 'Believing males / faithful'
  }
};

// Clean Tashkeel / Harakat normalizer for backward compatibility
export function stripHarakat(text: string): string {
  return cleanTashkeel(text);
}

/**
 * Perform Sarf Tahqeeq on any Arabic word via proxy API endpoint (/api/tahqeeq)
 * Retains user's original vocalized input for UI while using normalized comparisons for lookup
 */
export async function analyzeWordWithGemini(inputWord: string): Promise<TahqeeqData> {
  const cleanWord = inputWord.trim();
  const normalizedInput = normalizeArabic(cleanWord);
  const nfcInput = cleanWord.normalize('NFC');
  const hasHarakat = cleanWord !== cleanTashkeel(cleanWord);

  // 1. Direct exact match in preloaded dictionary (guarantees accurate active vs passive e.g. نُصِرَ vs نَصَرَ)
  if (PRELOADED_WORDS[cleanWord]) {
    return PRELOADED_WORDS[cleanWord];
  }
  if (PRELOADED_WORDS[nfcInput]) {
    return PRELOADED_WORDS[nfcInput];
  }

  // 2. Exact match iterating entries with NFC normalization
  for (const [key, val] of Object.entries(PRELOADED_WORDS)) {
    if (key === cleanWord || key.normalize('NFC') === nfcInput) {
      return val;
    }
  }

  // 3. If word is vocalized with harakat, check matching passive or active preloaded entry
  if (hasHarakat) {
    const isPassiveVocalization = /^[\u0600-\u06FF]\u064F/.test(cleanWord);
    for (const [key, val] of Object.entries(PRELOADED_WORDS)) {
      const keyNormalized = normalizeArabic(key);
      if (keyNormalized === normalizedInput) {
        const keyIsPassive = /^[\u0600-\u06FF]\u064F/.test(key) || val.bahath.includes('মাজহুল');
        if (isPassiveVocalization === keyIsPassive) {
          return {
            ...val,
            word: cleanWord
          };
        }
      }
    }
  } else {
    // 4. Unvocalized word (bare letters like "نصر"): match default normalized dictionary entry
    for (const [key, val] of Object.entries(PRELOADED_WORDS)) {
      if (normalizeArabic(key) === normalizedInput) {
        return {
          ...val,
          word: cleanWord
        };
      }
    }
  }

  // Call Server-Side Proxy Endpoint with graceful client-side fallback
  try {
    const response = await fetch('/api/tahqeeq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: cleanWord }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.word && data.seegah) {
        if (!data.rootLetters || data.rootLetters.length === 0) {
          data.rootLetters = extractProbableRoot(cleanWord);
        }
        return data as TahqeeqData;
      }
    }
  } catch (netErr) {
    console.warn('Network call failed, falling back to local Sarf engine:', netErr);
  }

  // Guaranteed fallback: analyze using local rule-based Sarf engine
  return analyzeSarfDeterministic(cleanWord);
}
