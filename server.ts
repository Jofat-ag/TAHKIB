import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI();

// Helper to call Gemini with retry & model fallback
async function generateTahqeeqWithFallback(prompt: string) {
  // Use high-capacity, low-latency Flash models supported on the free tier
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                wordType: { type: Type.STRING },
                seegah: { type: Type.STRING },
                seegahAr: { type: Type.STRING },
                seegahEn: { type: Type.STRING },
                bahath: { type: Type.STRING },
                bahathAr: { type: Type.STRING },
                bahathEn: { type: Type.STRING },
                baab: { type: Type.STRING },
                baabAr: { type: Type.STRING },
                baabEn: { type: Type.STRING },
                masdar: { type: Type.STRING },
                masdarMeaning: { type: Type.STRING },
                masdarMeaningEn: { type: Type.STRING },
                maddah: { type: Type.STRING },
                maddahAr: { type: Type.STRING },
                maddahEn: { type: Type.STRING },
                rootLetters: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                jins: { type: Type.STRING },
                jinsAr: { type: Type.STRING },
                jinsType: { type: Type.STRING },
                jinsEn: { type: Type.STRING },
                jinsTypeEn: { type: Type.STRING },
                meaning: { type: Type.STRING },
                meaningEn: { type: Type.STRING },
                meaningAr: { type: Type.STRING },
                tarkeebNote: { type: Type.STRING },
                tarkeebNoteAr: { type: Type.STRING },
                tarkeebNoteEn: { type: Type.STRING }
              },
              required: [
                'word', 'phonetic', 'wordType', 'seegah', 'seegahAr',
                'bahath', 'bahathAr', 'baab', 'baabAr', 'masdar',
                'masdarMeaning', 'maddah', 'maddahAr', 'rootLetters',
                'jins', 'jinsType', 'meaning', 'meaningEn'
              ]
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed && parsed.word && parsed.seegah) {
            return parsed;
          }
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[Gemini] ${model} attempt ${attempt + 1} notice:`, errMsg.slice(0, 180));
        
        // If quota limit or resource exhausted, do not retry the same model; try next fallback model immediately
        if (err?.status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          break;
        }

        // Brief delay before retry for transient network hiccups
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }

  throw lastError || new Error('All models exhausted');
}

app.post('/api/tahqeeq', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word || typeof word !== 'string' || !word.trim()) {
      return res.status(400).json({ error: 'Word is required' });
    }

    const cleanWord = word.trim();

    // Strict Arabic script validation: must contain Arabic characters and NO Latin / English letters
    const hasLatin = /[a-zA-Z]/.test(cleanWord);
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(cleanWord);

    if (hasLatin || !hasArabic) {
      return res.status(400).json({
        error: 'শুধুমাত্র আরবি হরফে লেখা শব্দ গ্রহণযোগ্য। ইংরেজি বা অন্যান্য হরফ সমর্থিত নয়।'
      });
    }

    const prompt = `
You are an expert Islamic Arabic Linguist specialized in Ilm as-Sarf (علم الصرف) and Darse Nizami classical Arabic grammar.
Analyze the following Arabic word and provide an authentic, scholarly, 100% accurate 7-point Tahqeeq breakdown in Bengali & Arabic:
Target Word: "${cleanWord}"

CRITICAL LINGUISTIC RULES (দরসে নিজামী ইলমে সরফ অনুকরণ করুন):

1. Word Type ('wordType'):
   - If it is a verb: "ফে'ল (فِعْل)"
   - If it is a derived noun: "ইসমে ফায়েল (اسْمُ الفَاعِلِ)", "ইসমে মাফঊল (اسْمُ المَفْعُولِ)", "ইসমে যরফ (اسْمُ الظَّرْفِ)", "ইসমে আলাহ (اسْمُ الآلَةِ)", "ইসমে তাফযীল (اسْمُ التَّفْضِيلِ)", "ছিফাতে মুশাব্বাহাহ (الصِّفَةُ المُشَبَّهَةُ)"

2. 'seegah' (Bengali) & 'seegahAr' (Arabic):
   - Keep standard, concise, conventional Sarf terminology:
     * "واحد مذكر غائب" / "ওয়াহিদ মুযাক্কার গায়েব"
     * "تثنية مذكر غائب" / "তাছনিয়া মুযাক্কার গায়েব"
     * "جمع مذكر غائب" / "জমা মুযাক্কার গায়েব"
     * "واحد مؤنث غائب" / "ওয়াহিদ মুয়ান্নাছ গায়েব"
     * "تثنية مؤنث غائب" / "তাছনিয়া মুয়ান্নাছ গায়েব"
     * "جمع مؤنث غائب" / "জমা মুয়ান্নাছ গায়েব"
     * "واحد مذكر حاضر" / "ওয়াহিদ মুযাক্কার হাযির"
     * "تثنية مذكر حاضر" / "তাছনিয়া মুযাক্কার হাযির"
     * "جمع مذكر حاضر" / "জমা মুযাক্কার হাযির"
     * "واحد مؤنث حاضر" / "ওয়াহিদ মুয়ান্নাছ হাযির"
     * "تثنية مؤنث حاضر" / "তাছনিয়া মুয়ান্নাছ হাযির"
     * "جمع مؤنث حاضر" / "জমা মুয়ান্নাছ হাযির"
     * "واحد متكلم" / "ওয়াহিদ মুতাকাল্লিম"
     * "جمع متكلم" / "জমা মুতাকাল্লিম"
     (For derived nouns, specify: ওয়াহিদ/তাছনিয়া/জমা + মুযাক্কার/মুয়ান্নাছ)

3. 'bahath' (Bengali) & 'bahathAr' (Arabic):
   - Support ALL classical Darse Nizami Sarf Bahaths accurately, including the 6 types of Maazi (মাযীর ৬ প্রকার):
     * মাযী মুতলাক্ব:
       - "إثبات فعل ماضٍ معروف" / "ইসবাত ফে'লে মাযী মারূফ" (e.g. نَصَرَ, كَتَبَ)
       - "إثبات فعل ماضٍ مجهول" / "ইসবাত ফে'লে মাযী মাজহুল" (e.g. نُصِرَ, قُتِلَ)
       - "نفي فعل ماضٍ معروف" / "নফী ফে'লে মাযী মারূফ" (e.g. مَا نَصَرَ)
       - "نفي فعل ماضٍ مجهول" / "নফী ফে'লে মাযী মাজহুল" (e.g. مَا نُصِرَ)
     * মাযী ক্বরীব (قَدْ সহ):
       - "إثبات فعل ماضٍ قريب معروف" / "ইসবাত ফে'লে মাযী ক্বরীব মারূফ" (e.g. قَدْ نَصَرَ - সে এইমাত্র সাহায্য করেছে / সাহায্য করেছে)
       - "إثبات فعل ماضٍ قريب مجهول" / "ইসবাত ফে'লে মাযী ক্বরীব মাজহুল" (e.g. قَدْ نُصِرَ)
       - "نفي فعل ماضٍ قريب معروف" / "নফী ফে'লে মাযী ক্বরীব মারূফ" (e.g. مَا قَدْ نَصَرَ)
     * মাযী বাঈদ (كَانَ + মাযী):
       - "إثبات فعل ماضٍ بعيد معروف" / "ইসবাত ফে'লে মাযী বাঈদ মারূফ" (e.g. كَانَ نَصَرَ / كَانَ قَدْ نَصَرَ - সে পূর্বে সাহায্য করেছিল)
       - "إثبات فعل ماضٍ بعيد مجهول" / "ইসবাত ফে'লে মাযী বাঈদ মাজহুল" (e.g. كَانَ نُصِرَ / كَانَ قَدْ نُصِرَ)
     * মাযী এস্তেমরারী / দাওয়ামী (كَانَ + মুযারে):
       - "إثبات فعل ماضٍ استمراري معروف" / "ইসবাত ফে'লে মাযী এস্তেমরারী মারূফ" (e.g. كَانَ يَنْصُرُ - সে সাহায্য করত / সাহায্য করতেছিল)
       - "إثبات فعل ماضٍ استمراري مجهول" / "ইসবাত ফে'লে মাযী এস্তেমরারী মাজহুল" (e.g. كَانَ يُنْصَرُ - তাকে সাহায্য করা হতো)
       - "نفي فعل ماضٍ استمراري معروف" / "নফী ফে'লে মাযী এস্তেমরারী মারূফ" (e.g. مَا كَانَ يَنْصُرُ / كَانَ لَا يَنْصُرُ)
     * মাযী এহতেমালী / শাক্কী (ল'আল্লামা / রুব্বামা / ইয়াকূন সহ):
       - "إثبات فعل ماضٍ احتمالي معروف" / "ইসবাত ফে'লে মাযী এহতেমালী মারূফ" (e.g. لَعَلَّمَا نَصَرَ, رُبَّمَا نَصَرَ)
     * মাযী তামান্নাঈ (লাইতামা / লাও সহ):
       - "إثبات فعل ماضٍ تمنائي معروف" / "ইসবাত ফে'লে মাযী তামান্নাঈ মারূফ" (e.g. لَيْتَمَا نَصَرَ)
     * মুযারে ও অন্যান্য বহছ:
       - "إثبات فعل مضارع معروف" / "ইসবাত ফে'লে মুজারে মারূফ" (e.g. يَنْصُرُ)
       - "إثبات فعل مضارع مجهول" / "ইসবাত ফে'লে মুজারে মাজহুল" (e.g. يُنْصَرُ)
       - "نفي فعل مضارع معروف" / "নফী ফে'লে মুজারে মারূফ" (e.g. لَا يَنْصُرُ)
       - "نفي فعل مضارع مجهول" / "নফী ফে'লে মুজারে মাজহুল" (e.g. لَا يُنْصَرُ)
       - "نفي جحد بلم معروف" / "নফী জাহাদ বিলম মারূফ" (e.g. لَمْ يَنْصُرْ)
       - "نفي جحد بلم مجهول" / "নফী জাহাদ বিলম মাজহুল" (e.g. لَمْ يُنْصَرْ)
       - "تأكيد بلن معروف" / "তাকিদ বিলান মারূফ" (e.g. لَنْ يَنْصُرَ)
       - "تأكيد بلن مجهول" / "তাকিদ বিলান মাজহুল" (e.g. لَنْ يُنْصَرَ)
       - "لام تأكيد بنون تأكيد ثقيلة معروف" / "লামে তাকীদ বা নূনে তাকীদে সাকীলাহ মারূফ" (e.g. لَيَنْصُرَنَّ, لَيَفْعَلَنَّ, لَأَضْرِبَنَّ)
       - "لام تأكيد بنون تأكيد ثقيلة مجهول" / "লামে তাকীদ বা নূনে তাকীদে সাকীলাহ মাজহুল" (e.g. لَيُنْصَرَنَّ, لَيُفْعَلَنَّ)
       - "لام تأكيد بنون تأكيد خفيفة معروف" / "লামে তাকীদ বা নূনে তাকীদে খফীফাহ মারূফ" (e.g. لَيَنْصُرَنْ)
       - "لام تأكيد بنون تأكيد خفيفة مجهول" / "লামে তাকীদ বা নূনে তাকীদে খফীফাহ মাজহুল" (e.g. لَيُنْصَرَنْ)
       - "فعل أمر حاضر معروف" / "ফে'লে আমর হাযির মারূফ" (e.g. اُنْصُرْ, اِهْدِ)
       - "فعل أمر غائب/متكلم معروف" / "ফে'লে আমর গায়েব/মুতাকাল্লিম মারূফ" (e.g. لِيَنْصُرْ)
       - "فعل أمر مجهول" / "ফে'লে আমর মাজহুল" (e.g. لِيُنْصَرْ)
       - "فعل نهي حاضر معروف" / "ফে'লে নাহী হাযির মারূফ" (e.g. لَا تَنْصُرْ, لَا تَقْنَطُوا)
       - "فعل نهي غائب/متكلم معروف" / "ফে'লে নাহী গায়েব মারূফ" (e.g. لَا يَنْصُرْ)
        - "فعل نهي مجهول" / "ফে'লে নাহী মাজহুল" (e.g. لَا يُنْصَرْ)
        - For Nouns (Asma' Mushtaqqah - أسماء مشتقة):
          * اسم الفاعل (Ism Fa'il): "اسم الفاعل" / "ইসমে ফায়েল" (e.g. نَاصِرٌ)
          * اسم المفعول (Ism Maf'ul): "اسم المفعول" / "ইসমে মাফঊল" (e.g. مَنْصُورٌ)
          * اسم الظرف (Ism Zarf): "اسم الظرف" / "ইসমে যরফ" (e.g. مَنْصَرٌ, مَسْجِدٌ, مَجْلِسٌ)
          * اسم الآلة (Ism Alah):
            - مِفْعَلٌ (e.g. مِنْصَرٌ, مِفْتَحٌ, مِبْرَدٌ): "اسم الآلة (صغرى)" / "ইসমে আলাহ সুগরা (ছোট যন্ত্র বা মাধ্যম)"
            - مِفْعَلَةٌ (e.g. مِنْصَرَةٌ, مِكْنَسَةٌ, مِلْعَقَةٌ): "اسم الآلة (وسطى)" / "ইসমে আলাহ উসতা (মাঝারি যন্ত্র বা মাধ্যম)"
            - مِفْعَالٌ (e.g. مِنْصَارٌ, مِفْتَاحٌ, مِيزَانٌ): "اسم الآلة (كبرى)" / "ইসমে আলাহ কুবরা (বড় যন্ত্র বা মাধ্যম)"
            - Seegah for singular Ism Alah / Ism Zarf: "واحد مذكر" / "ওয়াহিদ মুযাক্কার" (NOT gayeb/hazir/mutakallim)
          * اسم التفضيل (Ism Tafzeel): "اسم التفضيل" / "ইসমে তাফযীল" (e.g. أَنْصَرُ, أَكْبَرُ)
          * الصفة المشبهة (Sifat-e-Mushabbahah): "الصفة المشبهة" / "ছিফাতে মুশাব্বাহাহ" (e.g. شَرِيفٌ, كَرِيمٌ, حَسَنٌ, جَمِيلٌ primarily on فَعِيلٌ / فَعَلٌ patterns from Bab Karuma)

CRITICAL RULES FOR COMPOUND VERBS (যৌগিক ক্রিয়া যেমন كَانَ يَنْصُرُ, كَانَ نَصَرَ, قَدْ نَصَرَ):
- NEVER output invented invalid Bahath names like "মাযী ও মুজারে". Use the authentic classical term (e.g. "ইসবাত ফে'লে মাযী এস্তেমরারী মারূফ" for كَانَ يَنْصُرُ).
- The primary Sarf characteristics (Baab, Masdar, Maddah, Root Letters, and Jins) MUST be based on the MAIN ACTION VERB (الفعل الأصلي).
  * For "كَانَ يَنْصُرُ":
    - Main verb is يَنْصُرُ, so:
      * Maddah: 'ن - ص - ر (নূন-ছদ-র)' [DO NOT slash multiple roots like 'ك-و-ن / ن-ص-র']
      * Root Letters: ['ن', 'ص', 'ر']
      * Baab: 'বাব নাসারা-ইয়ানসুরু'
      * BaabAr: 'بَابُ نَصَرَ - يَنْصُرُ'
      * Masdar: 'النَّصْرُ (সাহায্য করা)'
      * Jins: 'ছহীহ (صَحِيح)'
      * Meaning: 'সে সাহায্য করত' (He used to help / was helping). [NEVER translate as 'সে ছিল সাহায্যকারী']
      * tarkeebNote: 'كَانَ হলো ফে'লে নাক্বিস (فعل ناقص), এর মধ্যকার মুসতাতীর যমীর هُوَ হলো তার ইসিম (اسم كان), এবং يَنْصُرُ ফে'ল-ফায়েল মিলে জুমলা ফে'লিয়া হয়ে كَانَ-এর খবর (خبر كان)। كَانَ তার ইসিম ও খবর নিয়ে জুমলা ফে'লিয়া নাকেসাহ।'
      * tarkeebNoteAr: 'كَانَ: فعل ماضٍ ناقص واسمه ضمير مستتر تقديره هو، وجملة (يَنْصُرُ) الفعلية في محل نصب خبر كان.'
      * tarkeebNoteEn: 'كَانَ is a deficient verb with an implied subject (هو). The verbal clause (يَنْصُرُ) functions as its predicate (Khabar Kaana).'

4. 'baab' & 'baabAr' (Conjugation Group):
   - CRITICAL FORMATTING: Keep 'baab' in Bengali ONLY (e.g. "বাব নাসারা-ইয়ানসুরু") without repeating the Arabic inside parenthesis, and 'baabAr' in pure Arabic (e.g. "بَابُ نَصَرَ - يَنْصُرُ"). Never duplicate Arabic names inside 'baab'.
   - Thulathi Mujarrad (ثلاثي مجرد):
     * "بَابُ نَصَرَ - يَنْصُرُ" / "বাব নাসারা-ইয়ানসুরু"
     * "بَابُ ضَرَبَ - يَضْرِبُ" / "বাব যারাবা-ইয়াযরিবু"
     * "بَابُ سَمِعَ - يَسْمَعُ" / "বাব সামিআ-ইয়াসমাউ"
     * "بَابُ فَتَحَ - يَفْتَحُ" / "বাব ফাতাহা-ইয়াফতাহু" (e.g. فَتَحَ, جَعَلَ)
     * "بَابُ كَرُمَ - يَكْرُمُ" / "বাব কারুমা-ইয়াকুরুমু" (e.g. كَرُمَ, حَسُنَ)
     * "بَابُ حَسِبَ - يَحْسِبُ" / "বাব হাসিবা-ইয়াহসিবু" (e.g. حَسِبَ)
   - Thulathi Mazid Fih (ثلاثي مزيد فيه):
     * "بَابُ الإِفْعَالِ" / "বাব ইফ'আল" (e.g. أَكْرَمَ, أَرْسَلَ, أَنْزَلَ)
     * "بَابُ التَّفْعِيلِ" / "বাব তাফ'ঈল" (e.g. عَلَّمَ, قَدَّمَ)
     * "بَابُ المُفَاعَلَةِ" / "বাব মুফা'আলাহ" (e.g. قَاتَلَ, جَاهَدَ)
     * "بَابُ التَّفَعُّلِ" / "বাব তাফা'উল" (e.g. تَكَلَّمَ, تَوَكَّلَ)
     * "بَابُ التَّفَاعُلِ" / "বাব তাফা'উল (আলিফসহ)" (e.g. تَعَاوَنَ, تَوَاصَوْا)
     * "بَابُ الاِفْتِعَالِ" / "বাব ইফতি'আল" (e.g. اكْتَسَبَ, اجْتَمَعَ, اتَّقَى)
     * "بَابُ الاِنْفِعَالِ" / "বাব ইনফি'আল" (e.g. انْقَلَبَ, انْفَطَرَ)
     * "بَابُ الاِسْتِفْعَالِ" / "বাব ইসতিফ'আল" (e.g. اسْتَغْفَرَ, اسْتَحْيَا)
     * "بَابُ الاِفْعِيلَالِ" / "বাব ইফ'ঈলাল" (e.g. احْمَارَّ)
   - Ruba'i (رباعي):
     * "بَابُ الفَعْلَلَةِ" / "বাব ফা'লালাহ (রুবায়ী মুজাররদ)" (e.g. زَلْزَلَ, دَحْرَجَ, وَسْوَسَ)
     * "بَابُ التَّفَعْلُلِ" / "বাব তাফা'লুল" (e.g. تَدَحْرَجَ)
     * "بَابُ الاِفْعِلَالِ" / "বাব ইফ'ইলাল" (e.g. اطْمَأَنَّ)

5. 'jins' & 'jinsAr' & 'jinsType' (Haft Qism / هفت قسم):
   - Correctly identify:
     * 'jinsAr' MUST ALWAYS be pure Arabic without English or Bengali (e.g. "صَحِيح", "مُضَاعَف", "مَهْمُوز الفَاء", "مِثَال وَاوِي", "أَجْوَف يَائِي", "نَاقِص وَاوِي", "لَفِيف مَفْرُوق")
     * 'jins' is the Bengali name (e.g. "ছহীহ", "মুদা'আফ", "মিছালে ওয়াভী")
     * 'jinsType' is the Bengali explanation (e.g. "ত্রুটিমুক্ত মূলবর্ণ")
     * 'jinsEn' is the English term (e.g. "Sound (Sahih)", "Mithal Wawi")

6. 'masdar' (المصدر):
   - 'masdar' MUST be the pure classical verbal noun in Arabic with proper harakat (e.g. "النَّصْرُ", "الشَّرَفُ", "الكِتَابَةُ"). DO NOT include Bengali in parentheses inside 'masdar'!
   - 'masdarMeaning': Bengali meaning (e.g. "সাহায্য করা", "উচ্চমর্যাদাশীল হওয়া")
   - 'masdarMeaningEn': English meaning (e.g. "To help", "To be noble/honorable")
7. 'maddah' & 'maddahAr': Pure 3 or 4 radicals (e.g. "ن - ص - ر" / "নূন - ছদ - র" / "N - S - R" for 'maddahEn').
8. 'meaning': Authentic Bengali meaning matching the exact grammatical form.
9. 'meaningEn': Authentic English meaning (e.g. "He helped", "Do not despair") matching the exact grammatical form.
10. 'meaningAr': Authentic classical Arabic explanation (e.g. "قام بتقديم العون والمساعدة").
11. English Sarf fields:
    - 'seegahEn': Clear English term (e.g. "Singular Masculine 3rd Person")
    - 'bahathEn': Clear English term (e.g. "Affirmative Past Active Voice")
    - 'baabEn': English title (e.g. "Bab Nasara - Yansuru")
    - 'jinsEn': English term (e.g. "Sound / Sahih")
    - 'jinsTypeEn': English explanation (e.g. "Free from weak letters and hamzah")
`;

    try {
      const parsed = await generateTahqeeqWithFallback(prompt);
      return res.json(parsed);
    } catch (aiErr: any) {
      console.warn('AI unavailable or rate-limited, client will use deterministic fallback:', aiErr?.message || aiErr);
      return res.status(503).json({ error: 'AI unavailable, fallback to client engine' });
    }
  } catch (error: any) {
    console.error('Server-side Gemini Tahqeeq error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to analyze word' });
  }
});

// Google Search Console verification endpoint
app.get('/google766c0f07344b6d74.html', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send('google-site-verification: google766c0f07344b6d74.html\n');
});

// Vite middleware mounting in development mode
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
