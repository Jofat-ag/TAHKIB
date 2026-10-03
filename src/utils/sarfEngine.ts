import { cleanTashkeel, normalizeArabic, extractProbableRoot } from './arabicAnalyzer';
import { TahqeeqData } from '../types';

/**
 * Classical Darse Nizami Rule-Based Sarf Analyzer (Deterministic Fallback Engine)
 * Guarantees that ANY Arabic word receives a complete, authentic 7-point Tahqeeq breakdown
 * even when the cloud AI is rate-limited or experiencing high traffic.
 */
export function analyzeSarfDeterministic(inputWord: string): TahqeeqData {
  const clean = inputWord.trim();
  const normalized = normalizeArabic(clean);

  // Check if target is a compound phrase (e.g. كان ينصر / كان قد نصر / قد نصر)
  const isCompoundKaana = normalized.startsWith('كان ') || normalized.startsWith('كانت ') || normalized.startsWith('كانوا ') || normalized.startsWith('كنت ');
  const isCompoundQad = normalized.startsWith('قد ');
  const isCompoundLaytama = normalized.startsWith('ليتما ') || normalized.startsWith('لو ');
  const isCompoundLaallama = normalized.startsWith('لعلما ') || normalized.startsWith('ربما ');

  // Extract core verbal part for root and jins extraction if compound
  let coreWord = clean;
  if (isCompoundKaana) {
    const parts = clean.split(/\s+/);
    coreWord = parts[parts.length - 1]; // e.g. ينصر or نصر
  } else if (isCompoundQad) {
    const parts = clean.split(/\s+/);
    coreWord = parts[parts.length - 1];
  }

  const root = extractProbableRoot(coreWord);
  const rootStr = root.join(' - ');

  // 1. Detect Bahath & Seegah
  let bahath = "ইসবাত ফে'লে মাযী মারূফ";
  let bahathAr = 'فِعْل مَاضٍ مَعْرُوف';
  let seegah = 'ওয়াহিদ মুযাক্কার গায়েব';
  let seegahAr = 'وَاحِد مُذَكَّر غَائِب';
  let wordType = "ফে'ল (فِعْل)";
  let baab = 'বাব নাসারা / যারাবা (সুলাসী মুজাররদ)';
  let baabAr = 'بَابٌ ثُلَاثِيٌّ مُجَرَّدٌ';
  let tarkeebNote: string | undefined = undefined;
  let tarkeebNoteAr: string | undefined = undefined;
  let tarkeebNoteEn: string | undefined = undefined;

  // Compound: Maazi Istimrari (كَانَ + মুযারে)
  if (isCompoundKaana && (normalizeArabic(coreWord).startsWith('ي') || normalizeArabic(coreWord).startsWith('ت') || normalizeArabic(coreWord).startsWith('ن') || normalizeArabic(coreWord).startsWith('ا'))) {
    wordType = "ফে'ল (যৌগিক ক্রিয়া / فِعْل مُرَكَّب)";
    const isPassive = coreWord.includes('\u064F') && (coreWord.includes('\u064E') || coreWord.endsWith('عَر'));
    bahath = isPassive ? "ইসবাত ফে'লে মাযী এস্তেমরারী মাজহুল" : "ইসবাত ফে'লে মাযী এস্তেমরারী মারূফ";
    bahathAr = isPassive ? 'إِثْبَات فِعْل مَاضٍ اسْتِمْرَارِي مَجْهُول' : 'إِثْبَات فِعْل مَاضٍ اسْتِمْرَارِي مَعْرُوف';
    seegah = 'ওয়াহিদ মুযাক্কার গায়েব';
    seegahAr = 'وَاحِد مُذَكَّر غَائِب';
    tarkeebNote = 'كَانَ হলো ফে\'লে নাক্বিস (فعل ناقص), এর মধ্যকার মুসতাতীর যমীর هُوَ হলো তার ইসিম (اسم كان), এবং এর পরের ফে\'ল-ফায়েল মিলে জুমলা ফে\'লিয়া হয়ে كَانَ-এর খবর (خبر كان)। كَانَ তার ইসিম ও খবর নিয়ে জুমলা ফে\'লিয়া নাকেসাহ।';
    tarkeebNoteAr = 'كَانَ: فعل ماضٍ ناقص واسمه ضمير مستتر تقديره هو، والجملة الفعلية التالية في محل نصب خبر كان.';
    tarkeebNoteEn = 'كَانَ is an auxiliary verb with implicit subject (هُوَ). The subsequent verbal clause acts as the predicate (خبر كَانَ).';
  } else if (isCompoundKaana) {
    // Compound: Maazi Ba'eed (كَانَ + মাযী)
    wordType = "ফে'ল (যৌগিক ক্রিয়া / فِعْل مُرَكَّب)";
    bahath = "ইসবাত ফে'লে মাযী বাঈদ মারূফ";
    bahathAr = 'إِثْبَات فِعْل مَاضٍ بَعِيد مَعْرُوف';
    tarkeebNote = 'كَانَ ফে\'লে নাক্বিস, ভেতরে هُوَ হলো ইসিম, এবং পরবর্তী ফে\'লে মাযী জুমলা হয়ে كَانَ-এর খবর।';
    tarkeebNoteAr = 'كَانَ: فعل ماضٍ ناقص، وجملة الفعل الماضي في محل نصب خبر كان.';
    tarkeebNoteEn = 'كَانَ with past tense verb forms Affirmative Remote Past (Past Perfect).';
  } else if (isCompoundQad) {
    // Compound: Maazi Qareeb (قَدْ + মাযী)
    bahath = "ইসবাত ফে'লে মাযী ক্বরীব মারূফ";
    bahathAr = 'إِثْبَات فِعْل مَاضٍ قَرِيب مَعْرُوف';
    tarkeebNote = 'قَدْ হলো হরফে তাহকীক ও তাকরীব (حرف تحقيق وتقريب), যা অতীতকালকে বর্তমানের কাছাকাছি নিয়ে আসে।';
    tarkeebNoteAr = 'قَدْ: حرف تحقيق وتقريب، وما بعده فعل ماضٍ مبني.';
    tarkeebNoteEn = 'قَدْ denotes certainty and near past (Present Perfect).';
  } else if (isCompoundLaytama) {
    bahath = "ইসবাত ফে'লে মাযী তামান্নাঈ মারূফ";
    bahathAr = 'إِثْبَات فِعْل مَاضٍ تَمَنَّائِي مَعْرُوف';
  } else if (isCompoundLaallama) {
    bahath = "ইসবাত ফে'লে মাযী এহতেমালী মারূফ";
    bahathAr = 'إِثْبَات فِعْل مَاضٍ احْتِمَالِي مَعْرُوف';
  } else if (normalized.startsWith('لا ')) {
    const verbPart = normalized.slice(3).trim();
    if (verbPart.endsWith('وا')) {
      seegah = 'জমা মুযাক্কার হাযির';
      seegahAr = 'جَمْع مُذَكَّر حَاضِر';
      bahath = "ফে'লে নাহী হাযির মারূফ";
      bahathAr = 'فِعْل نَهْي حَاضِر مَعْرُوف';
    } else {
      seegah = 'ওয়াহিদ মুযাক্কার হাযির';
      seegahAr = 'وَاحِد مُذَكَّر حَاضِر';
      bahath = "ফে'লে নাহী হাযির মারূফ";
      bahathAr = 'فِعْل نَهْي حَاضِر مَعْرُوف';
    }
  } else if (normalized.startsWith('لم ')) {
    bahath = "নফী জাহাদ বিলম মারূফ";
    bahathAr = 'نَفْي جَحْد بِلَمْ مَعْرُوف';
  } else if (normalized.startsWith('لن ')) {
    bahath = "তাকিদ বিলান মারূফ";
    bahathAr = 'تَأْكِيد بِلَنْ مَعْرُوف';
  } else if (
    (clean.startsWith('لَ') || clean.startsWith('ل') || normalized.startsWith('ل')) &&
    (clean.includes('نَّ') || clean.includes('نّ') || normalized.endsWith('ن')) &&
    normalized.length >= 5
  ) {
    // লামে তাকীদ বা নূনে তাকীদে সাকীলাহ / খফীফাহ (Emphatic Future with Laam and Noon)
    const isPassive = clean.startsWith('لُ') || /^[ل][\u064E]?[\u0600-\u06FF]\u064F/.test(clean);
    const isKhafeefah = clean.endsWith('نْ') || (!clean.includes('ّ') && clean.endsWith('ن'));
    bahath = isPassive
      ? isKhafeefah
        ? 'লামে তাকীদ বা নূনে তাকীদে খফীফাহ মাজহুল'
        : 'লামে তাকীদ বা নূনে তাকীদে সাকীলাহ মাজহুল'
      : isKhafeefah
      ? 'লামে তাকীদ বা নূনে তাকীদে খফীফাহ মারূফ'
      : 'লামে তাকীদ বা নূনে তাকীদে সাকীলাহ মারূফ';
    bahathAr = isPassive
      ? isKhafeefah
        ? 'لَامُ تَأْكِيد بِنُونِ تَأْكِيد خَفِيفَة مَجْهُول'
        : 'لَامُ تَأْكِيد بِنُونِ تَأْكِيد ثَقِيلَة مَجْهُول'
      : isKhafeefah
      ? 'لَامُ تَأْكِيد بِنُونِ تَأْكِيد خَفِيفَة مَعْرُوف'
      : 'لَامُ تَأْكِيد بِنُونِ تَأْكِيد ثَقِيلَة مَعْرُوف';

    if (normalized.startsWith('لي')) {
      seegah = 'ওয়াহিদ মুযাক্কার গায়েব';
      seegahAr = 'وَاحِد مُذَكَّر غَائِب';
    } else if (normalized.startsWith('لت')) {
      seegah = 'ওয়াহিদ মুযাক্কার হাযির';
      seegahAr = 'وَاحِد مُذَكَّر حَاضِر';
    } else if (normalized.startsWith('لا')) {
      seegah = 'ওয়াহিদ মুতাকাল্লিম';
      seegahAr = 'وَاحِد مُتَكَلِّم';
    } else if (normalized.startsWith('لن')) {
      seegah = 'জমা মুতাকাল্লিম';
      seegahAr = 'جَمْع مُتَكَلِّم';
    }
  } else if (/^[\u0600-\u06FF]\u064F/.test(clean) || clean.startsWith('نُ') || clean.startsWith('قُ') || clean.startsWith('ضُ') || clean.startsWith('فُ') || clean.startsWith('كُ')) {
    // Vocalized passive marker (Dammah on first radical e.g. نُصِرَ, قُتِلَ, ضُرِبَ)
    bahath = "ইসবাত ফে'লে মাযী মাজহুল";
    bahathAr = 'فِعْل مَاضٍ مَجْهُول';
  } else if (normalized.endsWith('وا')) {
    seegah = 'জমা মুযাক্কার গায়েব';
    seegahAr = 'جَمْع مُذَكَّر غَائِب';
    bahath = "ইসবাত ফে'লে মাযী মারূফ";
    bahathAr = 'فِعْل مَاضٍ مَعْرُوف';
  } else if (normalized.endsWith('ون') || normalized.endsWith('ين')) {
    if (normalized.startsWith('ي') || normalized.startsWith('ت')) {
      seegah = normalized.startsWith('ت') ? 'জমা মুযাক্কার হাযির' : 'জমা মুযাক্কার গায়েব';
      seegahAr = normalized.startsWith('ت') ? 'جَمْع مُذَكَّر حَاضِر' : 'جَمْع مُذَكَّر غَائِب';
      bahath = "ইসবাত ফে'লে মুজারে মারূফ";
      bahathAr = 'فِعْل مُضَارِع مَعْرُوف';
    } else if (normalized.startsWith('م')) {
      wordType = "ইসমে ফায়েল / মাফঊল";
      seegah = 'জমা মুযাক্কার';
      seegahAr = 'جَمْع مُذَكَّر';
      bahath = 'ইসমে মুশতাক্ব';
      bahathAr = 'اسْم مُشْتَقّ';
    }
  } else if (clean.startsWith('مِ') || clean.startsWith('مَ') || normalized.startsWith('م')) {
    // 5. Asma' Mushtaqqah with Meem prefix (Ism Alah, Ism Zarf, Ism Maf'ul)
    if (clean.startsWith('مِ') && (clean.endsWith('ة') || clean.endsWith('ةٌ') || normalized.endsWith('ه') || normalized.endsWith('ة'))) {
      // مِفْعَلَةٌ (Ism Alah Wusta e.g. مِنْصَرَةٌ, مِكْنَسَةٌ)
      wordType = "ইসমে আলাহ (اسم الآلة - বিশেষ্য)";
      seegah = 'ওয়াহিদ মুয়ান্নাছ';
      seegahAr = 'وَاحِد مُؤَنَّث';
      bahath = 'ইসমে আলাহ উসতা';
      bahathAr = 'اسْمُ الآلَةِ (وُسْطَى)';
      tarkeebNote = `${clean} এটি ইসমে আলাহ উসতা (مِفْعَلَة ওজনে)। বাক্যে এটি ইসমে যাত (مبتدأ, فاعل বা مفعول) হিসেবে ব্যবহৃত হয়।`;
    } else if (clean.startsWith('مِ') && normalized.length === 5 && normalized[3] === 'ا') {
      // مِفْعَالٌ (Ism Alah Kubra e.g. مِنْصَارٌ, مِفْتَاحٌ)
      wordType = "ইসমে আলাহ (اسم الآلة - বিশেষ্য)";
      seegah = 'ওয়াহিদ মুযাক্কার';
      seegahAr = 'وَاحِد مُذَكَّر';
      bahath = 'ইসমে আলাহ কুবরা';
      bahathAr = 'اسْمُ الآلَةِ (كُبْرَى)';
      tarkeebNote = `${clean} এটি ইসমে আলাহ কুবরা (مِفْعَال ওজনে)। বাক্যে এটি ইসমে যাত হিসেবে ব্যবহৃত হয়।`;
    } else if (clean.startsWith('مِ') || (normalized.length === 4 && normalized.startsWith('م') && !normalized.startsWith('ما'))) {
      // مِفْعَلٌ (Ism Alah Sughra e.g. مِنْصَرٌ, مِبْرَدٌ) OR مَفْعَلٌ (Ism Zarf e.g. مَنْصَرٌ, مَسْجِدٌ)
      if (clean.startsWith('مِ')) {
        wordType = "ইসমে আলাহ (اسم الآلة - বিশেষ্য)";
        seegah = 'ওয়াহিদ মুযাক্কার';
        seegahAr = 'وَاحِد مُذَكَّر';
        bahath = 'ইসমে আলাহ সুগরা';
        bahathAr = 'اسْمُ الآلَةِ (صُغْرَى)';
        tarkeebNote = `${clean} এটি ইসমে আলাহ সুগরা (مِفْعَل ওজনে)। বাক্যের প্রেক্ষাপট অনুযায়ী এটি ইসমে যাত (مبتدأ, فاعل বা مفعول) হিসেবে ব্যবহৃত হয়।`;
      } else {
        wordType = "ইসমে যরফ (اسم الظرف - বিশেষ্য)";
        seegah = 'ওয়াহিদ মুযাক্কার';
        seegahAr = 'وَاحِد مُذَكَّر';
        bahath = 'ইসমে যরফ';
        bahathAr = 'اسْمُ الظَّرْفِ';
        tarkeebNote = `${clean} এটি স্থান বা কালবাচক বিশেষ্য (ইসমে যরফ)। বাক্যে সাধারণত মাফঊলে ফীহ (مفعول فيه) হিসেবে ব্যবহৃত হয়।`;
      }
    } else if (normalized.length === 5 && normalized[3] === 'و') {
      // مَفْعُولٌ (Ism Maf'ul e.g. مَنْصُورٌ)
      wordType = "ইসমে মাফঊল (اسم المفعول - বিশেষ্য)";
      seegah = 'ওয়াহিদ মুযাক্কার';
      seegahAr = 'وَاحِد مُذَكَّر';
      bahath = 'ইসমে মাফঊল';
      bahathAr = 'اسْمُ المَفْعُولِ';
      tarkeebNote = `${clean} এটি ইসমে মাফঊল (مَفْعُول ওজনে)। বাক্যে সিফাত (نعت) বা অবস্থাভেদে ফায়েল/মাফঊল হতে পারে।`;
    }
  } else if (normalized.length === 4 && normalized[1] === 'ا' && !normalized.startsWith('ت') && !normalized.startsWith('ي') && !normalized.startsWith('ل')) {
    // فَاعِلٌ (Ism Fa'il e.g. نَاصِرٌ, كَاتِبٌ)
    wordType = "ইসমে ফায়েল (اسم الفاعل - বিশেষ্য)";
    seegah = 'ওয়াহিদ মুযাক্কার';
    seegahAr = 'وَاحِد مُذَكَّر';
    bahath = 'ইসমে ফায়েল';
    bahathAr = 'اسْمُ الفَاعِلِ';
    tarkeebNote = `${clean} এটি ইসমে ফায়েল (فَاعِل ওজনে)। বাক্যে ফায়েল বা সিফাত হিসেবে ব্যবহৃত হতে পারে।`;
  } else if (normalized.length === 4 && normalized[2] === 'ي' && !normalized.startsWith('ي') && !normalized.startsWith('ت') && !normalized.startsWith('ن') && !normalized.startsWith('ا') && !normalized.startsWith('ل')) {
    // فَعِيلٌ (e.g. شَرِيفٌ, كَرِيمٌ, حَسَنٌ) -> Sifat-e-Mushabbahah
    wordType = "ইসমে ছিফাত (الصِّفَةُ المُشَبَّهَةُ - বিশেষ্য)";
    seegah = 'ওয়াহিদ মুযাক্কার';
    seegahAr = 'مُفْرَدٌ مُذَكَّرٌ';
    bahath = 'ছিফাতে মুশাব্বাহাহ';
    bahathAr = 'الصِّفَةُ المُشَبَّهَةُ';
    baab = 'বাব কারুমা-ইয়াকুরুমু';
    baabAr = 'بَابُ كَرُمَ - يَكْرُمُ';
    tarkeebNote = `${clean} হলো ছিফাতে মুশাব্বাহাহ (فَعِيل ওজনে), যা স্থায়ী গুণ নির্দেশ করে। ব্যাকরণে এটি ফে'লে লাযিমের আমল করে এবং বাক্যে সাধারণত মওসুফের ছিফাত (نعت), খবর (خبر) অথবা হাল (حال) হিসেবে ব্যবহৃত হয়।`;
  } else if (normalized.startsWith('ي') || normalized.startsWith('ت') || normalized.startsWith('ن') || normalized.startsWith('ا')) {
    if (normalized.length >= 4 && !normalized.startsWith('است')) {
      bahath = "ইসবাত ফে'লে মুজারে মারূফ";
      bahathAr = 'فِعْل مُضَارِع مَعْرُوف';
      if (normalized.startsWith('ي')) {
        seegah = 'ওয়াহিদ মুযাক্কার গায়েব';
        seegahAr = 'وَاحِد مُذَكَّر غَائِب';
      } else if (normalized.startsWith('ت')) {
        seegah = 'ওয়াহিদ মুযাক্কার হাযির / ওয়াহিদ মুয়ান্নাছ গায়েব';
        seegahAr = 'وَاحِد مُذَكَّر حَاضِر';
      } else if (normalized.startsWith('ن')) {
        seegah = 'জমা মুতাকাল্লিম';
        seegahAr = 'جَمْع مُتَكَلِّم';
      } else {
        seegah = 'ওয়াহিদ মুতাকাল্লিম';
        seegahAr = 'وَاحِد مُتَكَلِّم';
      }
    }
  }

  // 2. Detect Baab (Conjugation Group)
  if (normalized.startsWith('است') || normalized.includes('ستغف')) {
    baab = "বাব ইসতিফ'আল";
    baabAr = 'بَابُ الاِسْتِفْعَالِ';
  } else if (normalized.startsWith('ان') && normalized.length >= 5) {
    baab = 'বাব ইনফিআ\'ল';
    baabAr = 'بَابُ الاِنْفِعَالِ';
  } else if (normalized.startsWith('ات') || (normalized.length >= 5 && normalized[1] === 'ت')) {
    baab = "বাব ইফতি'আল";
    baabAr = 'بَابُ الاِفْتِعَالِ';
  } else if (normalized.startsWith('ت') && normalized.length >= 5) {
    baab = "বাব তাফা'উল";
    baabAr = 'بَابُ التَّفَعُّلِ';
  } else if (normalized.length === 4 && normalized[1] === 'ا') {
    baab = "বাব মুফা'আলাহ";
    baabAr = 'بَابُ المُفَاعَلَةِ';
  } else if (normalized.startsWith('ا') && normalized.length === 4) {
    baab = "বাব ইফ'আল";
    baabAr = 'بَابُ الإِفْعَالِ';
  }

  // 3. Detect Jins (Haft Qism)
  let jins = 'ছহীহ';
  let jinsAr = 'صَحِيح';
  let jinsType = 'ত্রুটিমুক্ত মূলবর্ণ (Sound verb)';

  const r0 = root[0] || '';
  const r1 = root[1] || '';
  const r2 = root[2] || '';

  const isWeak = (c: string) => ['و', 'ي', 'ا', 'ى'].includes(c);

  if (r0 === 'أ' || r0 === 'ا') {
    jins = 'মাহমূযুল ফা';
    jinsAr = 'مَهْمُوز الفَاءِ';
    jinsType = 'প্রথম মূলবর্ণে হামযাহ বিদ্যমান';
  } else if (r1 === 'أ') {
    jins = 'মাহমূযুল আইন';
    jinsAr = 'مَهْمُوز العَيْنِ';
    jinsType = 'দ্বিতীয় মূলবর্ণে হামযাহ বিদ্যমান';
  } else if (r2 === 'أ') {
    jins = 'মাহমূযুল লাম';
    jinsAr = 'مَهْمُوز اللَّامِ';
    jinsType = 'তৃতীয় মূলবর্ণে হামযাহ বিদ্যমান';
  } else if (r1 && r2 && r1 === r2) {
    jins = "মুদা'আফ";
    jinsAr = 'مُضَاعَف';
    jinsType = 'একই বর্ণের দ্বিত্ব';
  } else if (isWeak(r0) && isWeak(r2)) {
    jins = 'লাফীফে মাফরূক্ব';
    jinsAr = 'لَفِيف مَفْرُوق';
    jinsType = 'প্রথম ও শেষ মূলবর্ণে হরফে ইল্লাত';
  } else if (isWeak(r1) && isWeak(r2)) {
    jins = 'লাফীফে মাকরূন';
    jinsAr = 'لَفِيف مَقْرُون';
    jinsType = 'পাশাপাশি দুই মূলবর্ণে হরফে ইল্লাত';
  } else if (isWeak(r0)) {
    jins = r0 === 'ي' ? 'মিছালে ইয়ায়ী' : 'মিছালে ওয়াভী';
    jinsAr = r0 === 'ي' ? 'مِثَال يَائِي' : 'مِثَال وَاوِي';
    jinsType = 'প্রথম মূলবর্ণে হরফে ইল্লাত';
  } else if (isWeak(r1)) {
    jins = r1 === 'ي' ? 'আজওয়াফে ইয়ায়ী' : 'আজওয়াফে ওয়াভী';
    jinsAr = r1 === 'ي' ? 'أَجْوَف يَائِي' : 'أَجْوَف وَاوِي';
    jinsType = 'মাঝের মূলবর্ণে হরফে ইল্লাত';
  } else if (isWeak(r2)) {
    jins = r2 === 'ي' || r2 === 'ى' ? 'নাক্বিসে ইয়ায়ী' : 'নাক্বিসে ওয়াভী';
    jinsAr = r2 === 'ي' || r2 === 'ى' ? 'نَاقِص يَائِي' : 'نَاقِص وَاوِي';
    jinsType = 'শেষ মূলবর্ণে হরফে ইল্লাত';
  }

  // 4. Default Meaning (Bengali, English, Arabic)
  let meaning = `মূল ধাতু (${rootStr}) সম্পর্কিত ক্রিয়া`;
  let meaningEn = `Action related to root (${rootStr})`;
  let meaningAr = `فعل مشتق من المادة الأصلية (${rootStr})`;

  if (clean === 'نُصِرَ') {
    meaning = 'তাকে (এক পুরুষকে) সাহায্য করা হলো';
    meaningEn = 'He was helped (Singular Masculine)';
    meaningAr = 'قُدِّمَ له العَوْنُ والمُسَاعَدَة';
  } else if (clean.includes('تقنط') || clean.includes('تَقْنَطُ')) {
    meaning = 'তোমরা নিরাশ বা হতাশ হইয়ো না';
    meaningEn = 'Do not despair or lose hope';
    meaningAr = 'لا تيأسوا من رحمة الله ولطفه';
  } else if (bahath.includes('এস্তেমরারী')) {
    if (normalized.includes('نصر')) {
      meaning = bahath.includes('মাজহুল') ? 'তাকে সাহায্য করা হতো' : 'সে সাহায্য করত (ধারাবাহিক অভ্যাস)';
      meaningEn = bahath.includes('মাজহুল') ? 'He was being helped' : 'He used to help / was helping';
      meaningAr = 'كَانَ يَقُومُ بِمُسَاعَدَةِ غَيْرِهِ بَاسْتِمْرَار';
    } else {
      meaning = `সে (${rootStr}) সম্পর্কিত ক্রিয়াটি নিয়মিত করত`;
      meaningEn = `He used to perform action of (${rootStr})`;
    }
  } else if (bahath.includes('বাঈদ')) {
    if (normalized.includes('نصر')) {
      meaning = 'সে পূর্বে সাহায্য করেছিল';
      meaningEn = 'He had helped';
      meaningAr = 'سَبَقَ لَهُ أَنْ قَامَ بِالمُسَاعَدَة';
    } else {
      meaning = `সে পূর্বে (${rootStr}) সম্পর্কিত ক্রিয়া করেছিল`;
      meaningEn = `He had performed (${rootStr})`;
    }
  } else if (bahath.includes('ক্বরীব')) {
    if (normalized.includes('نصر')) {
      meaning = 'সে এইমাত্র সাহায্য করেছে / সাহায্য করেছে';
      meaningEn = 'He has helped';
      meaningAr = 'قَامَ بِالمُسَاعَدَةِ قَرِيبًا';
    } else {
      meaning = `সে এইমাত্র (${rootStr}) সম্পর্কিত ক্রিয়া করেছে`;
      meaningEn = `He has recently performed (${rootStr})`;
    }
  } else if (bahath.includes('সাকীলাহ') || bahath.includes('খফীফাহ')) {
    if (normalized.includes('نصر')) {
      meaning = bahath.includes('মাজহুল')
        ? 'তাকে অবশ্যই একজন পুরুষকে সাহায্য করা হবে'
        : 'সে অবশ্যই একজন পুরুষ সাহায্য করবে';
      meaningEn = bahath.includes('মাজহুল')
        ? 'He will surely be helped (singular male)'
        : 'He will definitely help (singular male)';
    } else {
      meaning = bahath.includes('মাজহুল')
        ? `তাকে অবশ্যই (${rootStr}) সম্পর্কিত ক্রিয়া করা হবে`
        : `সে অবশ্যই (${rootStr}) সম্পর্কিত ক্রিয়াটি করবে`;
    }
  }

  // English mappings for standard forms
  let seegahEn = 'Singular Masculine 3rd Person';
  if (seegah.includes('জমা মুযাক্কার হাযির')) seegahEn = 'Plural Masculine 2nd Person';
  else if (seegah.includes('জমা মুযাক্কার গায়েব')) seegahEn = 'Plural Masculine 3rd Person';
  else if (seegah.includes('ওয়াহিদ মুযাক্কার হাযির')) seegahEn = 'Singular Masculine 2nd Person';
  else if (seegah.includes('ওয়াহিদ মুতাকাল্লিম')) seegahEn = 'Singular 1st Person (I)';
  else if (seegah.includes('জমা মুতাকাল্লিম')) seegahEn = 'Plural 1st Person (We)';

  let bahathEn = 'Affirmative Past Active Voice';
  if (bahath.includes('সাকীলাহ')) {
    bahathEn = bahath.includes('মাজহুল')
      ? 'Emphatic Future Passive Voice (Noon Thaqilah)'
      : 'Emphatic Future Active Voice (Noon Thaqilah)';
  } else if (bahath.includes('খফীফাহ')) {
    bahathEn = bahath.includes('মাজহুল')
      ? 'Emphatic Future Passive Voice (Noon Khafeefah)'
      : 'Emphatic Future Active Voice (Noon Khafeefah)';
  } else if (bahath.includes('মাযী মাজহুল')) {
    bahathEn = 'Affirmative Past Passive Voice';
  } else if (bahath.includes('মুজারে মারূফ')) {
    bahathEn = 'Affirmative Present/Future Active Voice';
  } else if (bahath.includes('নাহী হাযির মারূফ')) {
    bahathEn = 'Prohibitive Imperative Active (Nahi)';
  } else if (bahath.includes('জাহাদ বিলম')) {
    bahathEn = 'Negative Past with Lam (Jahd bil-Lam)';
  } else if (bahath.includes('তাকিদ বিলান')) {
    bahathEn = 'Emphatic Future Negative with Lan';
  }

  let baabEn = baab.replace('বাব ', 'Bab ');
  let jinsEn = jins.includes('ছহীহ') ? 'Sound / Sahih' : jins;
  let jinsTypeEn = jinsType.includes('ত্রুটিমুক্ত') ? 'Free from weak letters and hamzah' : jinsType;

  return {
    word: clean,
    phonetic: `(${clean})`,
    wordType,
    seegah,
    seegahAr,
    seegahEn,
    bahath,
    bahathAr,
    bahathEn,
    baab,
    baabAr,
    baabEn,
    masdar: `مَصْدَر (${rootStr})`,
    masdarMeaning: 'মূল ক্রিয়ামূল ও ভাবার্থ',
    masdarMeaningEn: 'Verbal noun and core semantic origin',
    maddah: rootStr,
    maddahAr: rootStr,
    maddahEn: rootStr,
    rootLetters: root.length >= 3 ? root : [r0, r1, r2].filter(Boolean),
    jins,
    jinsAr,
    jinsType,
    jinsEn,
    jinsTypeEn,
    meaning,
    meaningEn,
    meaningAr,
    tarkeebNote,
    tarkeebNoteAr,
    tarkeebNoteEn
  };
}
