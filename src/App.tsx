import React, { useState, useEffect } from 'react';
import { ActiveTab, AppSettings, AppLanguage, TahqeeqData } from './types';
import { analyzeWordWithGemini, PRELOADED_WORDS, cleanTashkeel, normalizeArabic } from './tahqeeqService';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [inputWord, setInputWord] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<TahqeeqData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search History state (clean, no mock cache)
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tahkib_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Exclude legacy mock words
        if (Array.isArray(parsed) && !(parsed.length === 3 && parsed[0] === 'نَصَرَ')) {
          return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Bookmarks state (clean, no mock cache)
  const [bookmarkedWords, setBookmarkedWords] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tahkib_bookmarks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !(parsed.length === 1 && parsed[0] === 'نَصَرَ')) {
          return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Modal / Dialog for Bookmarks and History
  const [showBookmarksModal, setShowBookmarksModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Settings (Default language is English as requested)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('tahkib_settings');
      const isManualLangSet = localStorage.getItem('tahkib_lang_selected_manual');
      if (saved) {
        const parsed = JSON.parse(saved);
        const lang: AppLanguage = isManualLangSet ? (parsed.appLanguage || 'en') : 'en';
        return {
          darkMode: false,
          arabicFontSize: 'large',
          autoAnalyzeOnChip: true,
          ...parsed,
          appLanguage: lang,
        };
      }
      return { arabicFontSize: 'large', autoAnalyzeOnChip: true, appLanguage: 'en', darkMode: false };
    } catch {
      return { arabicFontSize: 'large', autoAnalyzeOnChip: true, appLanguage: 'en', darkMode: false };
    }
  });

  // Sync dark mode class on root HTML element
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tahkib_history', JSON.stringify(searchHistory));
    } catch (e) {
      console.error(e);
    }
  }, [searchHistory]);

  // Save bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tahkib_bookmarks', JSON.stringify(bookmarkedWords));
    } catch (e) {
      console.error(e);
    }
  }, [bookmarkedWords]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tahkib_settings', JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings]);

  // Floating toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Language cycle & explicit set (English -> Arabic -> Bangla -> English)
  const cycleLanguage = () => {
    let nextLang: AppLanguage = 'en';
    if (settings.appLanguage === 'en') nextLang = 'ar';
    else if (settings.appLanguage === 'ar') nextLang = 'bn';
    else if (settings.appLanguage === 'bn') nextLang = 'en';

    try {
      localStorage.setItem('tahkib_lang_selected_manual', 'true');
    } catch {}

    setSettings((prev) => ({ ...prev, appLanguage: nextLang }));
    const msg =
      nextLang === 'ar'
        ? 'تم تحويل اللغة إلى العربية'
        : nextLang === 'en'
        ? 'Language switched to English'
        : 'ভাষা বাংলায় পরিবর্তন করা হয়েছে';
    triggerToast(msg);
  };

  const setLanguage = (lang: AppLanguage) => {
    try {
      localStorage.setItem('tahkib_lang_selected_manual', 'true');
    } catch {}

    setSettings((prev) => ({ ...prev, appLanguage: lang }));
    const msg =
      lang === 'ar'
        ? 'تم تحويل اللغة إلى العربية'
        : lang === 'en'
        ? 'Language switched to English'
        : 'ভাষা বাংলায় পরিবর্তন করা হয়েছে';
    triggerToast(msg);
  };

  // Dark Mode toggle
  const toggleDarkMode = () => {
    setSettings((prev) => {
      const nextDark = !prev.darkMode;
      triggerToast(
        nextDark
          ? isAr
            ? 'تم تفعيل الوضع الليلي'
            : isEn
            ? 'Dark mode activated'
            : 'ডার্ক মোড চালু করা হয়েছে'
          : isAr
          ? 'تم تفعيل الوضع النهاري'
          : isEn
          ? 'Light mode activated'
          : 'লাইট মোড চালু করা হয়েছে'
      );
      return { ...prev, darkMode: nextDark };
    });
  };

  const isAr = settings.appLanguage === 'ar';
  const isEn = settings.appLanguage === 'en';
  const isBn = settings.appLanguage === 'bn';

  // Perform Tahqeeq Analysis via Gemini
  const handleAnalyze = async (wordToAnalyze?: string) => {
    const target = (wordToAnalyze || inputWord).trim();
    if (!target) {
      triggerToast(
        isAr
          ? 'يرجى إدخال كلمة عربية'
          : isEn
          ? 'Please enter an Arabic word'
          : 'অনুগ্রহ করে একটি আরবি শব্দ লিখুন'
      );
      return;
    }

    // Check if input contains Latin/English letters
    const hasEnglish = /[a-zA-Z]/.test(target);
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(target);

    if (hasEnglish || !hasArabic) {
      triggerToast(
        isAr
          ? 'خطأ: التحقيق يقبل فقط الحروف العربية، يرجى كتابة كلمة عربية'
          : isEn
          ? 'Input error: Tahqeeq accepts Arabic script only. Please enter Arabic letters.'
          : 'ভুল ইনপুট: তাহকীক শুধুমাত্র আরবি হরফ গ্রহণ করে। কোনো ইংরেজি বা ভুল শব্দ সমর্থিত নয়।'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await analyzeWordWithGemini(target);
      setCurrentResult(res);

      // Add to Search History (deduplicated by exact word so distinct forms like نَصَرَ vs نُصِرَ are preserved)
      setSearchHistory((prev) => [target, ...prev.filter((w) => w !== target)].slice(0, 20));

      triggerToast(
        isAr
          ? `اكتمل التحقيق: ${res.word}`
          : isEn
          ? `Tahqeeq complete: ${res.word}`
          : `তাহকীক সম্পন্ন: ${res.word}`
      );
    } catch (err: any) {
      const errorMsg = err?.message || '';
      triggerToast(
        errorMsg.includes('আরবি') || errorMsg.includes('Arabic')
          ? errorMsg
          : isAr
          ? 'حدث خطأ أثناء التحقيق، يرجى المحاولة مرة أخرى'
          : isEn
          ? 'An error occurred during analysis, please try again'
          : 'তাহকীক করতে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: extracts pure Arabic verbal noun (Masdar), stripping any attached Bengali or Latin
  const getCleanArabicMasdar = (masdarStr?: string) => {
    if (!masdarStr) return '';
    const cleaned = masdarStr.replace(/\s*\([^)]*[\u0980-\u09FFa-zA-Z][^)]*\)/g, '').trim();
    return cleaned || masdarStr;
  };

  // Helper: guaranteed pure Arabic Jins (Haft Qism) terminology - Arabic is ALWAYS the primary root!
  const getArabicJins = (jinsAr?: string, jins?: string, jinsType?: string) => {
    if (jinsAr && /[\u0600-\u06FF]/.test(jinsAr) && !/[\u0980-\u09FF]/.test(jinsAr)) {
      return jinsAr;
    }
    const combined = `${jins || ''} ${jinsType || ''}`;
    if (combined.includes('مَهْمُوز') || combined.includes('মাহমূয')) {
      if (combined.includes('فَاء') || combined.includes('ফা')) return 'مَهْمُوز الفَاءِ';
      if (combined.includes('عَيْن') || combined.includes('আইন')) return 'مَهْمُوز العَيْنِ';
      if (combined.includes('لَّام') || combined.includes('لام') || combined.includes('লাম')) return 'مَهْمُوز اللَّامِ';
      return 'مَهْمُوز';
    }
    if (combined.includes('مُضَاعَف') || combined.includes('মুদাআফ') || combined.includes('মুদা\'আফ')) return 'مُضَاعَف';
    if (combined.includes('مَفْرُوق') || combined.includes('মাফরূক্ব') || combined.includes('মাফরূক')) return 'لَفِيف مَفْرُوق';
    if (combined.includes('مَقْرُون') || combined.includes('মাকরূন')) return 'لَفِيف مَقْرُون';
    if (combined.includes('مِثَال') || combined.includes('মিছাল')) {
      if (combined.includes('يَائِي') || combined.includes('ইয়ায়ী')) return 'مِثَال يَائِي';
      return 'مِثَال وَاوِي';
    }
    if (combined.includes('أَجْوَف') || combined.includes('আজওয়াফ') || combined.includes('আজওয়াফ')) {
      if (combined.includes('يَائِي') || combined.includes('ইয়ায়ী')) return 'أَجْوَف يَائِي';
      return 'أَجْوَف وَاوِي';
    }
    if (combined.includes('نَاقِص') || combined.includes('নাক্বিস') || combined.includes('নাকিস')) {
      if (combined.includes('يَائِي') || combined.includes('ইয়ায়ী')) return 'نَاقِص يَائِي';
      return 'نَاقِص وَاوِي';
    }
    const match = combined.match(/[\u0621-\u064A\u0671-\u06D3\s]+/);
    if (match && match[0].trim().length > 2) {
      return match[0].trim();
    }
    return 'صَحِيح';
  };

  // Copy structured 7-row result
  const handleCopyResult = () => {
    if (!currentResult) return;

    const cleanMasdar = getCleanArabicMasdar(currentResult.masdar);
    const arabicJins = getArabicJins(currentResult.jinsAr, currentResult.jins, currentResult.jinsType);

    // Helper to avoid duplicate Arabic parentheses when copying
    const formatBnField = (bnVal?: string, arVal?: string) => {
      if (!bnVal && !arVal) return '';
      if (!bnVal) return arVal || '';
      if (!arVal) return bnVal;
      // If bnVal already contains Arabic characters in parentheses or contains arVal, don't re-append
      if (bnVal.includes(arVal) || /[\u0600-\u06FF]/.test(bnVal)) {
        return bnVal;
      }
      return `${bnVal} (${arVal})`;
    };

    const formatted = isAr
      ? `الكلمة: ${currentResult.word}\n١. الصيغة: ${currentResult.seegahAr || currentResult.seegah}\n٢. البحث: ${currentResult.bahathAr || currentResult.bahath}\n٣. الباب: ${currentResult.baabAr || currentResult.baab}\n٤. المصدر: ${cleanMasdar}\n٥. المادة: ${currentResult.maddahAr || currentResult.maddah}\n٦. الجنس: ${arabicJins}\n٧. المعنى: ${currentResult.meaningAr || currentResult.meaning}\n— التحقيق والتركيب الميسر`
      : isEn
      ? `Word (الكلمة): ${currentResult.word}\n1. Form (الصيغة): ${currentResult.seegahAr} • ${currentResult.seegahEn || currentResult.seegah}\n2. Bahath (البحث): ${currentResult.bahathAr} • ${currentResult.bahathEn || currentResult.bahath}\n3. Bab (الباب): ${currentResult.baabAr} • ${currentResult.baabEn || currentResult.baab}\n4. Masdar (المصدر): ${cleanMasdar}${currentResult.masdarMeaningEn ? ` (${currentResult.masdarMeaningEn})` : ''}\n5. Root (المادة): ${currentResult.maddahAr} (${currentResult.maddahEn || currentResult.maddah})\n6. Type (الجنس): ${arabicJins} • ${currentResult.jinsEn || currentResult.jinsTypeEn || 'Sound (Sahih)'}\n7. Meaning (المعنى): ${currentResult.meaningEn || currentResult.meaning}\n— TAHKIB (Easy Arabic Tahqeeq & Tarkeeb)`
      : `শব্দ (الكلمة): ${currentResult.word}\n১. ছিগাহ: ${formatBnField(currentResult.seegah, currentResult.seegahAr)}\n২. বহছ: ${formatBnField(currentResult.bahath, currentResult.bahathAr)}\n৩. বাব: ${formatBnField(currentResult.baab, currentResult.baabAr)}\n৪. মাসদার: ${cleanMasdar}${currentResult.masdarMeaning ? ` (${currentResult.masdarMeaning})` : ''}\n৫. মাদ্দা: ${currentResult.maddah}\n৬. জিনস: ${arabicJins} (${currentResult.jins})\n৭. অর্থ: ${currentResult.meaning}\n— সহজ তাহকীক ও তারকীব`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(formatted).then(() => {
        triggerToast(
          isAr
            ? 'تم نسخ التحقيق إلى الحافظة'
            : isEn
            ? 'Tahqeeq copied to clipboard'
            : 'তাহকীক বিবরণ ক্লিপবোর্ডে কপি করা হয়েছে'
        );
      }).catch(() => {
        fallbackCopyText(formatted);
      });
    } else {
      fallbackCopyText(formatted);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      triggerToast(
        isAr ? 'تم نسخ التحقيق بنجاح' : isEn ? 'Tahqeeq copied successfully' : 'তাহকীক বিবরণ কপি করা হয়েছে'
      );
    } catch (e) {
      triggerToast(isAr ? 'تعذر النسخ' : isEn ? 'Failed to copy' : 'কপি করা সম্ভব হয়নি');
    }
  };

  // Share result
  const handleShare = async () => {
    if (!currentResult) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${isAr ? 'تحقيق:' : isEn ? 'Tahqeeq:' : 'সহজ তাহকীক:'} ${currentResult.word}`,
          text: `${isAr ? 'انظر إلى تحليل الصرف لكلمة' : isEn ? 'Explore Arabic Sarf breakdown for' : 'সহজ তাহকীক অ্যাপে'} '${currentResult.word}' ${isAr ? 'في تطبيق التحقيق والتركيب' : isEn ? 'in TAHKIB App.' : 'শব্দটির ইলমে সরফ তাহকীক বিশ্লেষণ দেখুন।'}`
        });
        triggerToast(isAr ? 'تمت المشاركة بنجاح' : isEn ? 'Shared successfully' : 'শেয়ার সম্পন্ন হয়েছে');
        return;
      } catch {
        // Fallback to copy if user canceled or rejected
      }
    }
    handleCopyResult();
  };

  // Bookmark toggle (checks exact match or normalized if unvocalized)
  const isBookmarked = Boolean(
    currentResult &&
    bookmarkedWords.some((w) => {
      if (w === currentResult.word) return true;
      const wClean = cleanTashkeel(w);
      const curClean = cleanTashkeel(currentResult.word);
      if (wClean === w || curClean === currentResult.word) {
        return normalizeArabic(w) === normalizeArabic(currentResult.word);
      }
      return false;
    })
  );

  const toggleBookmark = () => {
    if (!currentResult) return;
    const targetWord = currentResult.word;
    if (isBookmarked) {
      setBookmarkedWords((prev) =>
        prev.filter((w) => {
          if (w === targetWord) return false;
          if (cleanTashkeel(w) === cleanTashkeel(targetWord) && normalizeArabic(w) === normalizeArabic(targetWord)) return false;
          return true;
        })
      );
      triggerToast(
        isAr ? 'تمت الإزالة من الإشارات المرجعية' : isEn ? 'Removed from bookmarks' : 'বুকমার্ক থেকে সরানো হয়েছে'
      );
    } else {
      setBookmarkedWords((prev) => [targetWord, ...prev.filter((w) => w !== targetWord)]);
      triggerToast(
        isAr ? 'تمت الإضافة إلى الإشارات المرجعية' : isEn ? 'Saved to bookmarks' : 'বুকমার্কে যোগ করা হয়েছে'
      );
    }
  };

  // Paste action (safe for sandboxed iframes without window.prompt)
  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputWord(text.trim());
          triggerToast(
            isAr ? 'تم اللصق من الحافظة' : isEn ? 'Pasted from clipboard' : 'ক্লিপবোর্ড থেকে পেস্ট করা হয়েছে'
          );
          return;
        }
      }
    } catch {
      // Permission denied or clipboard blocked
    }
    triggerToast(
      isAr
        ? 'يرجى لصق الكلمة مباشرة في مربع الإدخال'
        : isEn
        ? 'Please paste directly into the input box'
        : 'অনুগ্রহ করে সরাসরি ইনপুট বক্সে পেস্ট করুন'
    );
  };

  // Native Arabic Pronunciation TTS
  const playAudioPronunciation = () => {
    if (!currentResult || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentResult.word);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
      triggerToast(isAr ? 'جاري الاستماع...' : isEn ? 'Playing pronunciation...' : 'উচ্চারণ বাজানো হচ্ছে...');
    } catch {
      // Speech synthesis error
    }
  };

  // Quick Harakat Insertion for easy typing
  const insertHarakat = (harakat: string) => {
    const input = document.getElementById('arabicInput') as HTMLInputElement | null;
    if (input && input.selectionStart !== null && input.selectionEnd !== null) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const updated = inputWord.slice(0, start) + harakat + inputWord.slice(end);
      setInputWord(updated);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + harakat.length, start + harakat.length);
      }, 0);
    } else {
      setInputWord((prev) => prev + harakat);
    }
  };

  const handleBackspace = () => {
    const input = document.getElementById('arabicInput') as HTMLInputElement | null;
    if (input && input.selectionStart !== null && input.selectionEnd !== null) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      if (start === end && start > 0) {
        const updated = inputWord.slice(0, start - 1) + inputWord.slice(start);
        setInputWord(updated);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start - 1, start - 1);
        }, 0);
      } else if (start !== end) {
        const updated = inputWord.slice(0, start) + inputWord.slice(end);
        setInputWord(updated);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start, start);
        }, 0);
      }
    } else {
      setInputWord((prev) => prev.slice(0, -1));
    }
  };

  // Example chip click
  const handleChipClick = (word: string) => {
    setInputWord(word);
    if (settings.autoAnalyzeOnChip) {
      handleAnalyze(word);
    }
  };

  // Select from history or bookmarks
  const selectWord = (word: string) => {
    setInputWord(word);
    setActiveTab('tahqeeq');
    handleAnalyze(word);
    setShowBookmarksModal(false);
    setShowHistoryModal(false);
  };

  // Arabic Font size calculation based on setting
  const getArabicDisplaySize = () => {
    if (settings.arabicFontSize === 'normal') return 'text-2xl sm:text-3xl';
    if (settings.arabicFontSize === 'medium') return 'text-3xl sm:text-4xl';
    return 'text-4xl sm:text-5xl';
  };

  return (
    <div className={`bg-[#f1fcf8] dark:bg-[#0b1310] text-[#141d1c] dark:text-[#e2ece7] min-h-screen flex flex-col font-sans selection:bg-[#ffdcc3] dark:selection:bg-emerald-950 dark:selection:text-emerald-300 selection:text-[#6e3900] transition-colors duration-200 ${isAr ? 'dir-rtl' : ''}`}>
      {/* ============================================================== */}
      {/* Top App Header                                                */}
      {/* ============================================================== */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-[#f1fcf8]/90 dark:bg-[#0b1310]/90 backdrop-blur-xl border-b border-[#dfebe7]/80 dark:border-[#1a2b24] shadow-[0_2px_12px_rgba(6,78,59,0.05)] transition-colors duration-200">
        <div className="h-16 px-4 flex items-center justify-between gap-2 max-w-4xl mx-auto">
          {/* Logo Only */}
          <div
            className="flex items-center min-w-0 cursor-pointer"
            onClick={() => setActiveTab('home')}
          >
            <img
              alt="TAHKIB Logo"
              className="h-8 w-auto object-contain flex-shrink-0 rounded shadow-xs hover:opacity-90 transition-opacity"
              src="https://lh3.googleusercontent.com/aida/AEtjO1UhcbtGbxGITVzrI2NEBdJP76PaRU7wlg88Q86AmBNeDpVPVqPxaWp5a8lMZNv_TOiFHjInlNnqAVYcooPFsy_ysVm6YNGS2dSO9zWeV2Ih8J5jfblQTLefmJZ7dF_AXhMRYXeIGjzcZvBCF0C0FzfbbQ0p27Fg9QqJ00Ee2aqxZgD1_FbOJIIMCTXMOxJYewzvA9xWsNpe09Q5OGW0uFgsL5ynEC7Rmt-fHb4VeA7qIag1ckJ-qbXmBis-"
            />
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Quick Dark Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              type="button"
              title={
                settings.darkMode
                  ? isAr
                    ? 'التحويل إلى الوضع النهاري'
                    : isEn
                    ? 'Switch to Light Mode'
                    : 'লাইট মোডে পরিবর্তন করুন'
                  : isAr
                  ? 'التحويل إلى الوضع الليلي'
                  : isEn
                  ? 'Switch to Dark Mode'
                  : 'ডার্ক মোডে পরিবর্তন করুন'
              }
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#e5f0ed] dark:bg-[#131f1a] text-[#003527] dark:text-emerald-300 hover:bg-[#dfebe7] dark:hover:bg-[#1a2b24] transition-colors border border-[#dfebe7] dark:border-[#22352c]"
            >
              <span className="material-symbols-outlined text-[19px]">
                {settings.darkMode ? 'dark_mode' : 'light_mode'}
              </span>
            </button>

            {/* Language / Translation Toggle Button (বাং / AR / EN) */}
            <button
              onClick={cycleLanguage}
              type="button"
              aria-label="ভাষা পরিবর্তন"
              title={
                isAr
                  ? 'تغيير اللغة (العربية / English / বাংলা)'
                  : isEn
                  ? 'Switch language (English / বাংলা / العربية)'
                  : 'ভাষা পরিবর্তন করুন (বাংলা / العربية / English)'
              }
              className="h-9 px-2.5 flex items-center justify-center gap-1 rounded-lg bg-[#e5f0ed] dark:bg-[#131f1a] text-[#003527] dark:text-emerald-300 text-xs font-semibold hover:bg-[#dfebe7] dark:hover:bg-[#1a2b24] transition-colors border border-[#dfebe7] dark:border-[#22352c]"
            >
              <span className="material-symbols-outlined text-[17px]">translate</span>
              <span className="font-bold">{isAr ? 'AR / বাং' : isEn ? 'EN / বাং' : 'বাং / AR'}</span>
            </button>

            {/* Saved Bookmarks Modal Button */}
            <button
              onClick={() => setShowBookmarksModal(true)}
              type="button"
              aria-label="বুকমার্ক"
              title={isAr ? 'الإشارات المرجعية' : isEn ? 'Saved Bookmarks' : 'সংরক্ষিত বুকমার্কস তালিকা'}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors border ${
                bookmarkedWords.length > 0
                  ? 'text-[#904d00] dark:text-amber-300 bg-[#ffdcc3] dark:bg-amber-950/50 border-amber-300 dark:border-amber-700/60'
                  : 'text-[#404944] dark:text-[#94a9a0] bg-[#e5f0ed] dark:bg-[#131f1a] hover:text-[#003527] dark:hover:text-emerald-300 border-[#dfebe7] dark:border-[#22352c]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {bookmarkedWords.length > 0 ? 'bookmark' : 'bookmark_border'}
              </span>
            </button>

            {/* Search History Button */}
            <button
              onClick={() => setShowHistoryModal(true)}
              type="button"
              title={isAr ? 'سجل البحث' : isEn ? 'Search History' : 'অনুসন্ধান ইতিহাস'}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#e5f0ed] dark:bg-[#131f1a] text-[#003527] dark:text-emerald-300 hover:bg-[#dfebe7] dark:hover:bg-[#1a2b24] transition-colors border border-[#dfebe7] dark:border-[#22352c]"
            >
              <span className="material-symbols-outlined text-[19px]">history</span>
            </button>

            {/* Profile / Person Icon Avatar */}
            <button
              onClick={() => setActiveTab('settings')}
              type="button"
              title={isAr ? 'الإعدادات' : isEn ? 'Settings' : 'সেটিংস'}
              className="w-8 h-8 rounded-full bg-[#003527] dark:bg-emerald-800 flex items-center justify-center flex-shrink-0 text-white shadow-xs hover:opacity-90 transition-opacity ml-0.5"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* Main View Container                                            */}
      {/* ============================================================== */}
      <main className="flex-1 w-full max-w-4xl mx-auto pt-20 pb-28 px-4 flex flex-col">
        {/* ========================================== */}
        {/* 1. VIEW: HOME (ভিউ: হোম)                  */}
        {/* ========================================== */}
        {activeTab === 'home' && (
          <div className="flex flex-col w-full space-y-5 animate-in fade-in duration-200">
            {/* Hero & Welcome Section from User Design */}
            <section className="flex flex-col items-center text-center pt-2 space-y-4">
              <div className="flex flex-col items-center space-y-1.5 max-w-xl mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdcc3] dark:bg-amber-950/60 text-[#6e3900] dark:text-amber-300 text-xs shadow-xs border border-amber-300/40 dark:border-amber-800/40">
                  <span className="material-symbols-outlined text-[15px] text-[#904d00] dark:text-amber-400">auto_awesome</span>
                  <span className={isEn ? "font-english-heading text-[10.5px] font-bold tracking-wider uppercase text-[#6e3900] dark:text-amber-300" : "font-medium"}>
                    {isAr ? 'منصة تحليل قواعد اللغة العربية' : isEn ? 'Arabic Grammar Analysis Platform' : 'আরবি ব্যাকরণ বিশ্লেষণ প্ল্যাটফর্ম'}
                  </span>
                </div>

                <h1 className={`text-[34px] sm:text-[44px] text-[#003527] dark:text-emerald-300 text-center ${isEn ? 'font-english-brand font-bold tracking-[0.06em]' : 'tracking-tight font-bold'}`}>
                  TAHKIB
                </h1>

                {isEn ? (
                  <p className="text-sm sm:text-base text-[#8a4400] dark:text-amber-300 font-english-editorial italic font-medium tracking-wide">
                    Arabic Grammar Guide <span className="not-italic text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-english-heading ml-1 border border-amber-300/40 dark:border-amber-800/40">Ilm as-Sarf & Ilm an-Nahw</span>
                  </p>
                ) : (
                  <p className="text-sm sm:text-base text-[#904d00] dark:text-amber-400 font-medium tracking-wide">
                    {isAr
                      ? 'دليل قواعد اللغة العربية — علم الصرف وعلم النحو'
                      : 'আরবি ব্যাকরণ সহায়িকা — ইলমে সরফ ও ইলমে নাহু'}
                  </p>
                )}

                <p className={`text-xs sm:text-sm text-[#404944] dark:text-[#94a9a0] max-w-md mx-auto leading-relaxed pt-0.5 ${isEn ? 'font-english-heading font-normal' : ''}`}>
                  {isAr
                    ? 'تحليل مبسط وموثوق لتصريف الكلمات وتركيب الجمل في ضوء علمي الصرف والنحو'
                    : isEn
                    ? 'Simplified and authentic analysis of Arabic morphology and sentence syntax'
                    : 'ইলমে সরফ ও ইলমে নাহুর আলোকে আরবি শব্দ রূপান্তর ও বাক্য গঠনের সহজ ও প্রামাণ্য বিশ্লেষণ'}
                </p>
              </div>

              {/* Two Feature Cards from User Design */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full pt-1">
                {/* Card 1: Tahqeeq (Active) */}
                <div className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#131f1a] text-left shadow-xs border border-[#904d00]/25 dark:border-emerald-600/30 hover:border-[#904d00]/45 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-lg bg-[#b0f0d6] dark:bg-emerald-950/80 text-[#003527] dark:text-emerald-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">menu_book</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold bg-[#b0f0d6] dark:bg-emerald-950/80 text-[#002117] dark:text-emerald-300 ${isEn ? 'font-english-heading font-bold tracking-wider uppercase' : ''}`}>
                        {isAr ? 'مفعّل' : isEn ? 'Active' : 'সক্রিয়'}
                      </span>
                    </div>
                    <div className={`text-base sm:text-lg font-bold text-[#003527] dark:text-emerald-400 leading-tight pt-1 ${isEn ? 'font-english-heading font-extrabold tracking-tight text-lg' : isBn ? 'font-bengali-serif' : 'font-arabic'}`}>
                      {isAr ? 'التحقيق' : isEn ? 'Tahqeeq' : 'তাহকীক'}
                    </div>
                    <p className={`text-[11px] sm:text-xs text-[#404944] dark:text-[#94a9a0] line-clamp-2 leading-relaxed ${isEn ? 'font-english-heading font-normal' : ''}`}>
                      {isAr
                        ? 'كشف الأصل، الباب، المادة، والتصريف لأي كلمة عربية'
                        : isEn
                        ? 'Uncover root letters, Bab, grammatical form, and tense'
                        : 'শব্দের মূলরূপ, বাব, মাদ্দা ও রূপান্তর সন্ধান'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('tahqeeq')}
                    className="mt-3.5 w-full py-2 px-2.5 rounded bg-[#003527] dark:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-[#064e3b] dark:hover:bg-emerald-600 transition-colors shadow-xs active:scale-[0.98]"
                    type="button"
                  >
                    <span className={isEn ? 'font-english-heading font-bold tracking-wide' : ''}>{isAr ? 'ابدأ التحقيق' : isEn ? 'Start Tahqeeq' : 'তাহকীক শুরু করুন'}</span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </button>
                </div>

                {/* Card 2: Tarkeeb (Coming Soon) */}
                <div className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl bg-[#dfebe7]/60 dark:bg-[#131f1a]/80 text-left border border-[#cad7d0]/60 dark:border-[#22352c] shadow-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-lg bg-[#e5f0ed] dark:bg-[#1a2b24] text-[#404944] dark:text-[#94a9a0] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">account_tree</span>
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ffdcc3] dark:bg-amber-950/40 text-[#6e3900] dark:text-amber-300 ${isEn ? 'font-english-heading font-bold tracking-wider uppercase' : ''}`}>
                        <span className="material-symbols-outlined text-[11px]">schedule</span>
                        {isAr ? 'قريباً' : isEn ? 'Soon' : 'শীঘ্রই'}
                      </span>
                    </div>
                    <div className={`text-base sm:text-lg font-bold text-[#404944] dark:text-[#e2ece7] leading-tight pt-1 ${isEn ? 'font-english-heading font-extrabold tracking-tight text-lg' : isBn ? 'font-bengali-serif' : 'font-arabic'}`}>
                      {isAr ? 'التركيب' : isEn ? 'Tarkeeb' : 'তারকীব'}
                    </div>
                    <p className={`text-[11px] sm:text-xs text-[#404944] dark:text-[#94a9a0] line-clamp-2 leading-relaxed ${isEn ? 'font-english-heading font-normal' : ''}`}>
                      {isAr
                        ? 'تحليل الإعراب والبنية النحوية للجمل الكاملة'
                        : isEn
                        ? 'Full sentence I\'raab parsing and structural syntax breakdown'
                        : 'সম্পূর্ণ বাক্যের ব্যাকরণগত গঠন ও ই\'রাব বিশ্লেষণ'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('tarkeeb')}
                    className="mt-3.5 w-full py-2 px-2.5 rounded bg-[#dae5e1] dark:bg-[#1a2b24] text-[#404944] dark:text-[#94a9a0] text-xs font-semibold flex items-center justify-center gap-1 hover:bg-[#dfebe7] dark:hover:bg-[#22352c] transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">lock</span>
                    <span className={isEn ? 'font-english-heading font-semibold tracking-wide' : ''}>{isAr ? 'قريباً' : isEn ? 'Coming Soon' : 'শীঘ্রই আসছে'}</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Recent Searches Bar on Homepage */}
            {searchHistory.length > 0 && (
              <section className="p-3 bg-white dark:bg-[#131f1a] rounded-xl border border-[#dfebe7] dark:border-[#22352c] shadow-xs flex items-center justify-between gap-2 overflow-hidden transition-colors">
                <div className="flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold text-[#003527] dark:text-emerald-400">
                  <span className="material-symbols-outlined text-[17px] text-[#904d00] dark:text-amber-400">history</span>
                  <span className={isEn ? 'font-english-heading font-bold uppercase tracking-wider text-[11px]' : ''}>{isAr ? 'الأخيرة:' : isEn ? 'Recent:' : 'সাম্প্রতিক:'}</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-1">
                  {searchHistory.slice(0, 6).map((word) => (
                    <button
                      key={word}
                      type="button"
                      onClick={() => selectWord(word)}
                      className="px-2.5 py-1 rounded-md bg-[#e5f0ed] dark:bg-[#1a2b24] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[#003527] dark:text-emerald-300 font-arabic text-sm font-bold border border-[#dfebe7] dark:border-[#2b4237] transition-colors flex-shrink-0"
                    >
                      {word}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className={`text-[11px] font-semibold text-[#904d00] dark:text-amber-400 hover:underline flex-shrink-0 ${isEn ? 'font-english-heading' : ''}`}
                >
                  {isAr ? 'عرض الكل' : isEn ? 'View all' : 'সব দেখুন'}
                </button>
              </section>
            )}

            {/* Quick Guide & Tips for Students */}
            <section className="p-4 rounded-xl bg-[#edf4f1] dark:bg-[#131f1a] border border-[#cad7d0]/60 dark:border-[#22352c] flex items-start gap-3 transition-colors">
              <span className="w-8 h-8 rounded-full bg-[#064e3b]/10 dark:bg-emerald-950/60 text-[#064e3b] dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[19px]">school</span>
              </span>
              <div className="space-y-1 min-w-0 flex-1">
                <h2 className={`text-xs font-bold uppercase tracking-wider text-[#064e3b] dark:text-emerald-400 ${isEn ? 'font-english-heading font-extrabold tracking-wider' : ''}`}>
                  {isAr ? 'إرشادات للطلاب والباحثين' : isEn ? 'Guidance for Arabic Students' : 'শিক্ষার্থীদের জন্য দিকনির্দেশনা'}
                </h2>
                <p className={`text-xs text-[#4a5d55] dark:text-[#94a9a0] leading-relaxed ${isEn ? 'font-english-heading font-normal' : ''}`}>
                  {isAr
                    ? 'الخطوة الأولى لفهم الكلمات العربية في القرآن والحديث هي معرفة حروفها الأصلية الثلاثة وتصريفها الصرفي. أدخل أي فعل أو اسم للاطلاع على تحليله الفوري.'
                    : isEn
                    ? 'The essential step to understanding Quranic and Hadith vocabulary is identifying the 3 core root radicals and their Sarf patterns. Enter any Arabic word to inspect its instant scholarly breakdown.'
                    : 'কুরআন ও হাদিসের আরবি শব্দ বুঝার প্রথম ধাপ হলো তার তিন মূলবর্ণ বের করে সরফ বোঝা। যেকোনো ফেল বা ইসম ইনপুট দিয়ে তাৎক্ষণিক ব্যাকরণিক তাহকীক দেখুন।'}
                </p>
              </div>
            </section>
          </div>
        )}

        {/* ========================================== */}
        {/* 2. VIEW: TAHQEEQ (ভিউ: তাহকীক ওয়ার্কস্পেস)  */}
        {/* ========================================== */}
        {activeTab === 'tahqeeq' && (
          <div className="flex flex-col w-full space-y-4 animate-in fade-in duration-200">
            {/* Back Navigation Header */}
            <div className="flex items-center justify-between pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#064e3b] dark:text-emerald-400 hover:text-[#022c22] dark:hover:text-emerald-300 px-2.5 py-1.5 rounded-lg bg-[#edf4f1] dark:bg-[#1a2b24] border border-[#cad7d0]/50 dark:border-[#2b4237] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>{isAr ? 'الرجوع للرئيسية' : isEn ? 'Back to Home' : 'হোমপেজে ফিরে যান'}</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#064e3b] dark:text-emerald-400 hover:text-[#022c22] dark:hover:text-emerald-300 px-2 py-1 rounded bg-[#edf4f1] dark:bg-[#1a2b24] border border-[#cad7d0]/50 dark:border-[#2b4237]"
                  title={isAr ? 'سجل البحث' : isEn ? 'Search History' : 'অনুসন্ধান ইতিহাস'}
                >
                  <span className="material-symbols-outlined text-[15px]">history</span>
                  <span>{isAr ? 'السجل' : isEn ? 'History' : 'ইতিহাস'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputWord('')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#b45309] dark:text-amber-400 hover:underline"
                >
                  <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                  <span>{isAr ? 'إعادة ضبط' : isEn ? 'Reset' : 'রিসেট'}</span>
                </button>
              </div>
            </div>

            {/* Workspace Title Header */}
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-7 rounded-full bg-[#064e3b] dark:bg-emerald-500"></span>
              <div>
                <h2 className="font-bengali-serif text-lg font-bold text-[#064e3b] dark:text-emerald-400 tracking-tight">
                  {isAr ? 'مساحة عمل التحقيق الصرفي' : isEn ? 'Sarf Tahqeeq Workspace' : 'তাহকীক ওয়ার্কস্পেস'}
                </h2>
                <p className="text-xs text-[#4a5d55] dark:text-[#94a9a0]">
                  {isAr
                    ? 'أدخل أي فعل أو اسم باللغة العربية'
                    : isEn
                    ? 'Enter any Arabic verb or noun for full morphological analysis'
                    : 'যেকোনো আরবি ফে\'ল বা ইসম দিন'}
                </p>
              </div>
            </div>

            {/* Input Box & Actions */}
            <div className="flex flex-col p-4 bg-white dark:bg-[#131f1a] rounded-xl border border-[#cad7d0]/60 dark:border-[#22352c] shadow-xs space-y-3 transition-colors">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[#13211c] dark:text-[#e2ece7]" htmlFor="arabicInput">
                  {isAr ? 'مدخل الكلمة للتحليل' : isEn ? 'Arabic Word Input' : 'শব্দ বিশ্লেষণ ইনপুট'}
                </label>
                <span className="text-[#4a5d55] dark:text-[#94a9a0]">
                  {isAr
                    ? 'مع الحركات أو بدونها'
                    : isEn
                    ? 'With or without tashkeel (harakat)'
                    : 'হরকতসহ বা ছাড়া'}
                </span>
              </div>

              {/* Input Field with Arabic Focus */}
              <div className="relative flex items-center">
                <input
                  id="arabicInput"
                  type="text"
                  dir="rtl"
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAnalyze();
                  }}
                  placeholder={
                    isAr
                      ? 'اكتب كلمة عربية هنا...'
                      : isEn
                      ? 'Type Arabic word e.g.: نَصَرَ, كَتَبَ...'
                      : 'আরবি শব্দ লিখুন...'
                  }
                  className="w-full h-14 pl-12 pr-4 rounded-lg bg-[#edf4f1] dark:bg-[#1a2b24] text-[#064e3b] dark:text-emerald-300 font-arabic text-2xl font-bold placeholder:text-[#cad7d0] dark:placeholder:text-[#3d594b] border border-[#cad7d0]/70 dark:border-[#2b4237] focus:outline-none focus:border-[#064e3b] dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-[#131f1a] transition-all text-right"
                />
                <div className="absolute left-2.5 flex items-center gap-1">
                  {inputWord && (
                    <button
                      type="button"
                      onClick={() => setInputWord('')}
                      title={isAr ? 'مسح' : isEn ? 'Clear' : 'মুছে ফেলুন'}
                      className="w-8 h-8 rounded text-[#4a5d55] dark:text-[#94a9a0] hover:text-red-600 dark:hover:text-red-400 hover:bg-[#e2ece7] dark:hover:bg-[#22352c] transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePaste}
                    title={isAr ? 'لصق من الحافظة' : isEn ? 'Paste from clipboard' : 'ক্লিপবোর্ড থেকে পেস্ট'}
                    className="w-8 h-8 rounded text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-300 hover:bg-[#e2ece7] dark:hover:bg-[#22352c] transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_paste</span>
                  </button>
                </div>
              </div>

              {/* Quick Harakat / Tashkeel Insert Strip for Easy Typing */}
              <div className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-[#edf4f1]/80 dark:bg-[#1a2b24]/60 border border-[#cad7d0]/50 dark:border-[#2b4237]/60 overflow-x-auto">
                <div className="flex items-center gap-1 flex-1">
                  {[
                    { char: 'َ', name: 'فتحة', labelBn: 'যবর (ফাতহাহ)' },
                    { char: 'ِ', name: 'كسرة', labelBn: 'জের (কাসরাহ)' },
                    { char: 'ُ', name: 'ضمة', labelBn: 'পেশ (যম্মাহ)' },
                    { char: 'ْ', name: 'سكون', labelBn: 'জযম (সুকূন)' },
                    { char: 'ّ', name: 'شدة', labelBn: 'তাশদীদ (শাদ্দাহ)' },
                    { char: 'ً', name: 'تنوين فتح', labelBn: 'দুই যবর' },
                    { char: 'ٍ', name: 'تنوين كسر', labelBn: 'দুই জের' },
                    { char: 'ٌ', name: 'تنوين ضم', labelBn: 'দুই পেশ' },
                    { char: 'ٰ', name: 'ألف خنجرية', labelBn: 'খাড়া যবর' },
                  ].map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => insertHarakat(item.char)}
                      title={`${item.name} — ${item.labelBn}`}
                      className="w-8 h-8 rounded bg-white dark:bg-[#131f1a] hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-[#064e3b] dark:text-emerald-300 font-arabic text-lg font-bold border border-[#cad7d0]/60 dark:border-[#2b4237] shadow-2xs flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                    >
                      {item.char}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleBackspace}
                  title={isAr ? 'حذف حرف' : isEn ? 'Backspace' : 'একটি হরফ মুছুন'}
                  className="h-8 px-2 rounded bg-white dark:bg-[#131f1a] hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-medium text-xs border border-[#cad7d0]/60 dark:border-[#2b4237] shadow-2xs flex items-center justify-center gap-1 transition-all active:scale-95 flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">backspace</span>
                </button>
              </div>

              {/* Submit Action Button with Spinner State */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleAnalyze()}
                className="w-full h-11 rounded-lg bg-[#064e3b] dark:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#022c22] dark:hover:bg-emerald-600 active:scale-[0.99] transition-all shadow-xs disabled:opacity-75"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>
                      {isAr
                        ? 'جارٍ التحقيق الصرفي...'
                        : isEn
                        ? 'Analyzing Sarf morphology...'
                        : 'বিশ্লেষণ হচ্ছে...'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-amber-300">
                      search_insights
                    </span>
                    <span>
                      {isAr
                        ? 'تحقيق الكلمة (Analyze)'
                        : isEn
                        ? 'Analyze Word (Tahqeeq)'
                        : 'তাহকীক করুন (Analyze)'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Structured 7-Row Linguistic Breakdown Result Card */}
            {currentResult ? (
              <div className="flex flex-col rounded-xl bg-white dark:bg-[#131f1a] border border-[#cad7d0]/70 dark:border-[#22352c] shadow-xs overflow-hidden transition-all duration-300">
              {/* Result Card Header */}
              <div className="p-3.5 bg-[#edf4f1]/70 dark:bg-[#1a2b24]/80 border-b border-[#cad7d0]/50 dark:border-[#22352c] flex flex-col space-y-1.5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-[#064e3b] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
                      {isAr ? 'تحقيق ناجح' : isEn ? 'Verified Tahqeeq' : 'সফল তাহকীক'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                      {isAr
                        ? currentResult.wordType || 'فِعْل'
                        : isEn
                        ? (currentResult.wordType?.includes('فِعْل') ? 'Verb (فِعْل)' : currentResult.wordType)
                        : currentResult.wordType || "ফে'ল (فِعْل)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleBookmark}
                      title={isAr ? 'إشارة مرجعية' : isEn ? 'Bookmark' : 'বুকমার্ক'}
                      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                        isBookmarked
                          ? 'text-[#b45309] dark:text-amber-300 bg-[#fef3c7] dark:bg-amber-950/40'
                          : 'text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isBookmarked ? 'bookmark' : 'bookmark_border'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      title={isAr ? 'مشاركة' : isEn ? 'Share' : 'শেয়ার করুন'}
                      className="w-8 h-8 rounded flex items-center justify-center text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-300 hover:bg-[#e2ece7] dark:hover:bg-[#22352c] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[17px]">share</span>
                    </button>
                  </div>
                </div>

                {/* Primary Arabic Word Highlight Box */}
                <div className="flex items-center justify-between pt-2 pb-1">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-arabic font-bold text-[#064e3b] dark:text-emerald-300 tracking-wider drop-shadow-xs ${getArabicDisplaySize()}`}
                      >
                        {currentResult.word}
                      </span>
                      <button
                        type="button"
                        onClick={playAudioPronunciation}
                        title={isAr ? 'استمع للنطق الصوتي' : isEn ? 'Listen to Arabic pronunciation' : 'আরবি উচ্চারণ শুনুন'}
                        className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-[#064e3b] dark:text-emerald-300 flex items-center justify-center transition-all active:scale-90"
                      >
                        <span className="material-symbols-outlined text-[17px]">volume_up</span>
                      </button>
                    </div>
                    <span className="text-[11px] font-medium text-[#4a5d55] dark:text-[#94a9a0]">
                      {currentResult.phonetic}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#4a5d55] dark:text-[#94a9a0]">
                      {isAr ? 'الأصل' : isEn ? 'Root' : 'মূলবর্ণ'}
                    </span>
                    <div className="flex items-center gap-1 dir-rtl">
                      {currentResult.rootLetters?.map((ch, idx) => (
                        <span
                          key={idx}
                          className="w-7 h-7 rounded-md bg-[#064e3b] dark:bg-emerald-700 text-white font-arabic text-sm flex items-center justify-center font-bold shadow-xs"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 7-Row Structured Breakdown (Arabic is ALWAYS the core ground!) */}
              <div className="divide-y divide-[#cad7d0]/40 dark:divide-[#22352c] text-xs">
                {/* Row 1: ছিগাহ / الصيغة / Form */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-[#edf4f1]/40 dark:hover:bg-[#1a2b24]/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full bg-[#064e3b] dark:bg-emerald-400"></span>
                    <span className="font-semibold text-[#064e3b] dark:text-emerald-400">
                      {isAr ? '١. الصيغة' : isEn ? '1. Form (الصيغة)' : '১. ছিগাহ (الصيغة)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#064e3b] dark:text-emerald-400 font-arabic text-sm">
                      {currentResult.seegahAr || currentResult.seegah}
                    </div>
                    {isEn && (
                      <div className="text-[11px] text-[#13211c] dark:text-[#e2ece7]">
                        {currentResult.seegahEn || currentResult.seegahAr}
                      </div>
                    )}
                    {isBn && (
                      <div className="text-[11px] text-[#13211c] dark:text-[#e2ece7]">
                        {currentResult.seegah}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: বহছ / البحث / Category */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#edf4f1]/30 dark:bg-[#1a2b24]/30 hover:bg-[#edf4f1]/70 dark:hover:bg-[#1a2b24]/60 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full bg-[#064e3b] dark:bg-emerald-400"></span>
                    <span className="font-semibold text-[#064e3b] dark:text-emerald-400">
                      {isAr ? '٢. البحث' : isEn ? '2. Bahath (البحث)' : '২. বহছ (البحث)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#064e3b] dark:text-emerald-400 font-arabic text-sm">
                      {currentResult.bahathAr || currentResult.bahath}
                    </div>
                    {isEn && (
                      <div className="text-[11px] text-[#13211c] dark:text-[#e2ece7]">
                        {currentResult.bahathEn || currentResult.bahathAr}
                      </div>
                    )}
                    {isBn && (
                      <div className="text-[11px] text-[#13211c] dark:text-[#e2ece7]">
                        {currentResult.bahath}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: বাব / الباب / Conjugation */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-[#edf4f1]/40 dark:hover:bg-[#1a2b24]/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full bg-[#064e3b] dark:bg-emerald-400"></span>
                    <span className="font-semibold text-[#064e3b] dark:text-emerald-400">
                      {isAr ? '٣. الباب' : isEn ? '3. Bab (الباب)' : '৩. বাব (الباب)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#b45309] dark:text-amber-400 font-arabic text-sm">
                      {currentResult.baabAr || currentResult.baab}
                    </div>
                    {isEn && (
                      <div className="text-[11px] text-[#13211c] dark:text-[#e2ece7]">
                        {currentResult.baabEn || currentResult.baabAr}
                      </div>
                    )}
                    {isBn && (
                      <div className="text-[11px] text-[#13211c] dark:text-[#e2ece7]">
                        {currentResult.baab}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 4: মাসদার / المصدر / Verbal Noun */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#edf4f1]/30 dark:bg-[#1a2b24]/30 hover:bg-[#edf4f1]/70 dark:hover:bg-[#1a2b24]/60 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full bg-[#064e3b] dark:bg-emerald-400"></span>
                    <span className="font-semibold text-[#064e3b] dark:text-emerald-400">
                      {isAr ? '٤. المصدر' : isEn ? '4. Masdar (المصدر)' : '৪. মাসদার (المصدر)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[#13211c] dark:text-[#e2ece7] font-arabic text-sm">
                      {getCleanArabicMasdar(currentResult.masdar) || currentResult.masdar}
                    </div>
                    {isEn && (
                      <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                        {currentResult.masdarMeaningEn || 'Verbal Noun'}
                      </div>
                    )}
                    {isAr && (
                      <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0] font-arabic dir-rtl">
                        المصدر الأصلي
                      </div>
                    )}
                    {isBn && (
                      <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                        {currentResult.masdarMeaning || currentResult.masdar}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 5: মাদ্দা / المادة / Root */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-[#edf4f1]/40 dark:hover:bg-[#1a2b24]/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full bg-[#064e3b] dark:bg-emerald-400"></span>
                    <span className="font-semibold text-[#064e3b] dark:text-emerald-400">
                      {isAr ? '٥. المادة' : isEn ? '5. Root (المادة)' : '৫. মাদ্দা (المادة)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#064e3b] dark:text-emerald-400 font-arabic text-sm">
                      {currentResult.maddahAr || currentResult.maddah}
                    </div>
                    {isEn && (
                      <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                        {currentResult.maddahEn || currentResult.maddahAr}
                      </div>
                    )}
                    {isBn && (
                      <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                        {currentResult.maddah}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 6: জিনস / الجنس / Type (Haft Qism) */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#edf4f1]/30 dark:bg-[#1a2b24]/30 hover:bg-[#edf4f1]/70 dark:hover:bg-[#1a2b24]/60 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full bg-[#064e3b] dark:bg-emerald-400"></span>
                    <span className="font-semibold text-[#064e3b] dark:text-emerald-400">
                      {isAr ? '٦. الجنس' : isEn ? '6. Type (الجنس)' : '৬. জিনস (الجنس)'}
                    </span>
                  </div>
                  <div className="text-right">
                    {/* Arabic is the sacred, primary word of Tahqeeq! Always displayed prominently */}
                    <div className="font-semibold text-[#13211c] dark:text-[#e2ece7] font-arabic">
                      {getArabicJins(currentResult.jinsAr, currentResult.jins, currentResult.jinsType)}
                    </div>
                    {isEn && (
                      <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                        {currentResult.jinsEn || 'Sound (Sahih)'}
                        {currentResult.jinsTypeEn ? ` • ${currentResult.jinsTypeEn}` : ''}
                      </div>
                    )}
                    {isAr && (
                      <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0] font-arabic dir-rtl">
                        من أقسام الهَفْت أَقْسَام
                      </div>
                    )}
                    {isBn && (
                      <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                        {currentResult.jins} • {currentResult.jinsType}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 7: অর্থ / المعنى / Meaning */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-[#edf4f1]/40 dark:hover:bg-[#1a2b24]/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full bg-[#064e3b] dark:bg-emerald-400"></span>
                    <span className="font-semibold text-[#064e3b] dark:text-emerald-400">
                      {isAr ? '٧. المعنى' : isEn ? '7. Meaning (المعنى)' : '৭. অর্থ (المعنى)'}
                    </span>
                  </div>
                  <div className="text-right">
                    {isEn ? (
                      <div>
                        <div className="font-bold text-[#064e3b] dark:text-emerald-300 text-sm">
                          {currentResult.meaningEn || currentResult.meaning}
                        </div>
                        {currentResult.meaningAr && (
                          <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0] font-arabic mt-0.5 dir-rtl">
                            {currentResult.meaningAr}
                          </div>
                        )}
                      </div>
                    ) : isAr ? (
                      <div className="font-bold text-[#064e3b] dark:text-emerald-300 text-sm font-arabic dir-rtl">
                        {currentResult.meaningAr || currentResult.meaningEn || currentResult.meaning}
                      </div>
                    ) : (
                      <div>
                        <div className="font-bold text-[#064e3b] dark:text-emerald-300 text-sm">
                          {currentResult.meaning}
                        </div>
                        {currentResult.meaningEn && (
                          <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                            {currentResult.meaningEn}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Utility Copy & Share Footer */}
              <div className="p-3 bg-[#edf4f1]/50 dark:bg-[#1a2b24]/60 border-t border-[#cad7d0]/50 dark:border-[#22352c] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-[#131f1a] border border-[#cad7d0]/60 dark:border-[#22352c] text-[#064e3b] dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs hover:bg-[#e2ece7] dark:hover:bg-[#22352c] transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>{isAr ? 'نسخ التحقيق' : isEn ? 'Copy Tahqeeq' : 'তাহকীক কপি করুন'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="h-9 px-3 rounded-lg bg-white dark:bg-[#131f1a] border border-[#cad7d0]/60 dark:border-[#22352c] text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs hover:bg-[#e2ece7] dark:hover:bg-[#22352c] transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  <span>{isAr ? 'مشاركة' : isEn ? 'Share' : 'শেয়ার'}</span>
                </button>
              </div>
            </div>
            ) : (
              <div className="p-8 rounded-xl bg-white dark:bg-[#131f1a] border border-[#cad7d0]/60 dark:border-[#22352c] text-center flex flex-col items-center justify-center space-y-2.5 shadow-xs">
                <span className="w-12 h-12 rounded-full bg-[#ebf6f2] dark:bg-[#1a2b24] text-[#003527] dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                  <span className="material-symbols-outlined text-[26px]">manage_search</span>
                </span>
                <div className="space-y-1">
                  <h3 className="font-bengali-serif font-bold text-base text-[#003527] dark:text-emerald-400">
                    {isAr ? 'أدخل كلمة عربية لبدء التحقيق' : isEn ? 'Enter an Arabic word to begin Tahqeeq' : 'তাহকীক শুরু করতে যেকোনো আরবি শব্দ লিখুন'}
                  </h3>
                  <p className="text-xs text-[#4a5d55] dark:text-[#94a9a0] max-w-sm leading-relaxed mx-auto">
                    {isAr
                      ? 'اكتب أي فعل أو اسم واضغط على زر التحقيق للاطلاع على الباب، المادة، والصيغة'
                      : isEn
                      ? 'Type any verb or noun and click Analyze to view Bab, Root, and Form breakdown'
                      : 'যেকোনো ফে’ল বা ইসম টাইপ করে তাহকীক বাটনে চাপ দিলে সঙ্গে সঙ্গে মূলরূপ, বাব ও মাদ্দার বিবরণ পাবেন'}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Tips Box */}
            <div className="bg-[#edf4f1] dark:bg-[#131f1a] rounded-xl p-3.5 flex items-start gap-2.5 border border-[#cad7d0]/60 dark:border-[#22352c] transition-colors">
              <div className="w-7 h-7 rounded-full bg-[#fef3c7] dark:bg-amber-950/60 text-[#b45309] dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[16px]">lightbulb</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-[#b45309] dark:text-amber-400">
                  {isAr ? 'نصيحة لتيسير التحقيق' : isEn ? 'Helpful Sarf Tip' : 'তাহকীক করার সহজ টিপস'}
                </span>
                <p className="text-xs text-[#4a5d55] dark:text-[#94a9a0] leading-relaxed">
                  {isAr
                    ? 'قاعدة التحقيق: حدد الحروف الأصلية الثلاثة للفعل (فاء وعين ولام الكلمة). بحذف الزوائد في البداية والنهاية تستطيع معرفة الباب والتصريف بسهولة.'
                    : isEn
                    ? 'Tahqeeq Rule: Identify the 3 core root radicals (Fa, Ayn, Lam). By dropping grammatical prefixes and suffixes, you can readily deduce the Bab and Sarf conjugations.'
                    : 'যেকোনো ফে\'লের মূল ৩টি হরফ (ফা-আইন-লাম) চিহ্নিত করুন। অতিরিক্ত আলামত (যেমন: শুরুতে তা, আলিফ বা শেষে ওয়াও-নূন) বাদ দিলে সহজেই মূল বাব নির্ণয় করা যায়।'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 3. VIEW: TARKEEB (ভিউ: তারকীব প্রিভিউ)      */}
        {/* ========================================== */}
        {activeTab === 'tarkeeb' && (
          <div className="flex flex-col w-full space-y-4 animate-in fade-in duration-200">
            {/* Back Navigation Header */}
            <div className="flex items-center justify-between pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#064e3b] dark:text-emerald-400 hover:text-[#022c22] dark:hover:text-emerald-300 px-2.5 py-1.5 rounded-lg bg-[#edf4f1] dark:bg-[#1a2b24] border border-[#cad7d0]/50 dark:border-[#2b4237] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>{isAr ? 'الرجوع للرئيسية' : 'হোমপেজে ফিরে যান'}</span>
              </button>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                <span className="material-symbols-outlined text-[14px]">update</span>
                <span>{isAr ? 'قريباً' : 'শীঘ্রই আসছে'}</span>
              </span>
            </div>

            {/* Tarkeeb Header */}
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-7 rounded-full bg-[#b45309] dark:bg-amber-500"></span>
              <div>
                <h2 className="font-bengali-serif text-lg font-bold text-[#064e3b] dark:text-emerald-400 tracking-tight">
                  {isAr ? 'محرر التركيب النحوي' : isEn ? 'Sentence Syntax & Tarkeeb' : 'তারকীব মডিউল'}
                </h2>
                <p className="text-xs text-[#4a5d55] dark:text-[#94a9a0]">
                  {isAr
                    ? 'الإعراب التفصيلي وبنية الجمل الكاملة'
                    : isEn
                    ? 'Detailed grammatical parsing & whole sentence structure'
                    : 'সম্পূর্ণ বাক্যের ই\'রাব ও গঠন বিন্যাস'}
                </p>
              </div>
            </div>

            {/* Sentence Syntax Tree Preview Card */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#131f1a] border border-[#cad7d0]/70 dark:border-[#22352c] shadow-xs space-y-4 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-[#cad7d0]/40 dark:border-[#22352c]">
                <span className="text-xs font-bold text-[#064e3b] dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-[#b45309] dark:text-amber-400">account_tree</span>
                  {isAr ? 'نموذج مبدئي لشجرة الإعراب' : isEn ? 'Sentence Syntax Tree Model' : 'সিনট্যাক্স ট্রির একটি নমুনা রূপরেখা'}
                </span>
                <span className="text-[11px] font-mono text-[#4a5d55] dark:text-[#94a9a0]">Syntax Tree Preview</span>
              </div>

              {/* Visual Grammar Tree Prototype */}
              <div className="p-4 bg-[#edf4f1]/70 dark:bg-[#1a2b24]/70 rounded-xl flex flex-col items-center text-center space-y-3 border border-[#cad7d0]/40 dark:border-[#2b4237]">
                <div className="px-3.5 py-1.5 rounded-md bg-[#064e3b] dark:bg-emerald-700 text-white font-bold text-xs tracking-wide shadow-xs font-arabic">
                  جُمْلَةٌ فِعْلِيَّةٌ (Verbal Sentence)
                </div>
                <div className="w-0.5 h-4 bg-[#cad7d0] dark:bg-[#2b4237]"></div>
                <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                  <div className="flex flex-col items-center p-2.5 rounded-lg bg-white dark:bg-[#131f1a] border border-[#cad7d0]/50 dark:border-[#22352c] shadow-2xs">
                    <span className="font-arabic text-lg font-bold text-[#064e3b] dark:text-emerald-300">نَصَرَ</span>
                    <span className="text-[11px] text-[#b45309] dark:text-amber-400 font-semibold mt-0.5 font-arabic">
                      {isAr ? 'فعل' : isEn ? 'Verb (فعل)' : 'فعل (ফে\'ল)'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 rounded-lg bg-white dark:bg-[#131f1a] border border-[#cad7d0]/50 dark:border-[#22352c] shadow-2xs">
                    <span className="font-arabic text-lg font-bold text-[#064e3b] dark:text-emerald-300">زَيْدٌ</span>
                    <span className="text-[11px] text-[#b45309] dark:text-amber-400 font-semibold mt-0.5 font-arabic">
                      {isAr ? 'فاعل' : isEn ? 'Subject (فاعل)' : 'فاعل (ফায়েল)'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 rounded-lg bg-white dark:bg-[#131f1a] border border-[#cad7d0]/50 dark:border-[#22352c] shadow-2xs">
                    <span className="font-arabic text-lg font-bold text-[#064e3b] dark:text-emerald-300">عَمْرًا</span>
                    <span className="text-[11px] text-[#b45309] dark:text-amber-400 font-semibold mt-0.5 font-arabic">
                      {isAr ? 'مفعول' : isEn ? 'Object (مفعول)' : 'مفعول (মাফ\'উল)'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#4a5d55] dark:text-[#94a9a0] leading-relaxed">
                {isAr
                  ? 'سيتم قريباً توفير تحليل الإعراب للآيات القرآنية والأحاديث الشريفة تلقائياً عبر مخططات بصرية تفاعلية تفصل المبتدأ والخبر والفاعل والمفعول.'
                  : isEn
                  ? 'The Tarkeeb module will automatically parse sentences from the Quran and Hadith into interactive diagrams, breaking down Mubtada, Khabar, Fa\'il, Maf\'ul, Sifah-Mawsuf, and other syntactic structures.'
                  : 'তারকীব মডিউলে কুরআনিক আয়াত ও হাদিসের যেকোনো বাক্যের তারকীব (মুবতাদা, খবর, ফায়েল, মাফ\'উল, সিফাত-মাওসূফ ইত্যাদি) স্বয়ংক্রিয়ভাবে ইন্টারঅ্যাকটিভ ডায়াগ্রামের মাধ্যমে উপস্থাপন করা হবে।'}
              </p>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('tahqeeq')}
                  className="w-full py-2.5 px-3 rounded-lg bg-[#064e3b] dark:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#022c22] dark:hover:bg-emerald-600 transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                  <span>{isAr ? 'التحقيق الصرفي حالياً' : isEn ? 'Use Tahqeeq Analyzer' : 'বর্তমানে তাহকীক করুন'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 4. VIEW: SETTINGS (ভিউ: সেটিংস)            */}
        {/* ========================================== */}
        {activeTab === 'settings' && (
          <div className="flex flex-col w-full space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-7 rounded-full bg-[#064e3b] dark:bg-emerald-500"></span>
              <div>
                <h2 className="font-bengali-serif text-lg font-bold text-[#064e3b] dark:text-emerald-400 tracking-tight">
                  {isAr ? 'الإعدادات والتفضيلات' : isEn ? 'Settings & Preferences' : 'সেটিংস ও পছন্দসমূহ'}
                </h2>
                <p className="text-xs text-[#4a5d55] dark:text-[#94a9a0]">
                  {isAr
                    ? 'التحكم بحجم الخط واللغة والذاكرة'
                    : isEn
                    ? 'Manage language, font size, theme, and data'
                    : 'অ্যাপ্লিকেশনের ফন্ট ও পারফরম্যান্স নিয়ন্ত্রণ'}
                </p>
              </div>
            </div>

            {/* Settings Card */}
            <div className="flex flex-col bg-white dark:bg-[#131f1a] rounded-xl border border-[#cad7d0]/60 dark:border-[#22352c] shadow-xs divide-y divide-[#cad7d0]/40 dark:divide-[#22352c] text-xs">
              {/* Option: Night Reading / Dark Mode Toggle */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[17px] text-[#b45309] dark:text-amber-400">
                      {settings.darkMode ? 'dark_mode' : 'light_mode'}
                    </span>
                    <span className="font-semibold text-[#13211c] dark:text-[#e2ece7]">
                      {isAr ? 'الوضع الليلي (قراءة مريحة)' : isEn ? 'Dark Mode (Night Reading)' : 'ডার্ক মোড (নৈশ পাঠ)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                    {isAr
                      ? 'ألوان داكنة مريحة للعين لقراءة النصوص والبحوث ليلاً'
                      : isEn
                      ? 'High-contrast dark palette tailored for night reading and Arabic manuscripts'
                      : 'রাতের বেলা চোখের আরাম ও সহজে আরবি কিতাব পড়ার জন্য ডার্ক থিম'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.darkMode ? 'bg-emerald-600' : 'bg-[#cad7d0] dark:bg-[#2b4237]'
                  }`}
                  aria-label="Toggle dark mode"
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.darkMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Option 1: 3-Way Language Switcher (BN / AR / EN) */}
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#13211c] dark:text-[#e2ece7]">
                    {isAr ? 'لغة التطبيق والتحقيق' : isEn ? 'Application Language' : 'অ্যাপ্লিকেশন ভাষা'}
                  </span>
                  <p className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                    {isAr
                      ? 'اختر لغة الشرح والمعنى (مع بقاء العربية أساساً دائماً)'
                      : isEn
                      ? 'Select language for explanations & meaning (Arabic is always primary)'
                      : 'তাহকীক ও ব্যাখ্যার ভাষা (আরবি সবসময় মূল ভিত্তি থাকবে)'}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-[#edf4f1] dark:bg-[#1a2b24] p-1 rounded-lg border border-[#cad7d0]/50 dark:border-[#2b4237] flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setLanguage('bn')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      settings.appLanguage === 'bn'
                        ? 'bg-[#064e3b] dark:bg-emerald-700 text-white shadow-2xs'
                        : 'text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-400'
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('ar')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors font-arabic ${
                      settings.appLanguage === 'ar'
                        ? 'bg-[#064e3b] dark:bg-emerald-700 text-white shadow-2xs'
                        : 'text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-400'
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      settings.appLanguage === 'en'
                        ? 'bg-[#064e3b] dark:bg-emerald-700 text-white shadow-2xs'
                        : 'text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-400'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Option 2: Arabic Font Size */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#13211c] dark:text-[#e2ece7]">
                    {isAr ? 'حجم الخط العربي' : isEn ? 'Arabic Font Size' : 'আরবি ফন্ট সাইজ'}
                  </span>
                  <p className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                    {isAr
                      ? 'حجم عرض الكلمة في التحقيق'
                      : isEn
                      ? 'Display size of Arabic script in results'
                      : 'তাহকীক ফলাফলে আরবি শব্দের আকার'}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-[#edf4f1] dark:bg-[#1a2b24] p-1 rounded-lg border border-[#cad7d0]/50 dark:border-[#2b4237]">
                  {(['normal', 'medium', 'large'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, arabicFontSize: sz }))}
                      className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors ${
                        settings.arabicFontSize === sz
                          ? 'bg-[#064e3b] dark:bg-emerald-700 text-white shadow-2xs'
                          : 'text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-400'
                      }`}
                    >
                      {sz === 'normal'
                        ? isAr
                          ? 'عادي'
                          : isEn
                          ? 'Normal'
                          : 'স্বাভাবিক'
                        : sz === 'medium'
                        ? isAr
                          ? 'متوسط'
                          : isEn
                          ? 'Medium'
                          : 'মাঝারি'
                        : isAr
                        ? 'كبير'
                        : isEn
                        ? 'Large'
                        : 'বড়'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 3: Auto-Analyze on Chip */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#13211c] dark:text-[#e2ece7]">
                    {isAr ? 'التحقيق المباشر عند اختيار نموذج' : isEn ? 'Instant Analysis on Click' : 'উদাহরণ শব্দে সরাসরি বিশ্লেষণ'}
                  </span>
                  <p className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                    {isAr
                      ? 'البدء الفوري بالتحقيق بمجرد النقر على الكلمة'
                      : isEn
                      ? 'Start Tahqeeq automatically when tapping a sample word'
                      : 'নমুনা শব্দে ট্যাপ করলেই বিশ্লেষণ শুরু হবে'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      autoAnalyzeOnChip: !prev.autoAnalyzeOnChip
                    }))
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.autoAnalyzeOnChip ? 'bg-[#064e3b] dark:bg-emerald-600' : 'bg-[#cad7d0] dark:bg-[#2b4237]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.autoAnalyzeOnChip ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Option 4: History Management */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#13211c] dark:text-[#e2ece7]">
                    {isAr ? 'سجل البحث' : isEn ? 'Search History' : 'অনুসন্ধান ইতিহাস (History)'}
                  </span>
                  <p className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                    {isAr
                      ? `إجمالي الكلمات المحفوظة في السجل: ${searchHistory.length}`
                      : isEn
                      ? `Total saved search words: ${searchHistory.length}`
                      : `মোট সাম্প্রতিক শব্দ: ${searchHistory.length} টি`}
                  </p>
                </div>
                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchHistory([]);
                      triggerToast(
                        isAr ? 'تم مسح سجل البحث' : isEn ? 'Search history cleared' : 'সব অনুসন্ধান ইতিহাস মুছে ফেলা হয়েছে'
                      );
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md border border-red-200 dark:border-red-800/60 transition-colors"
                  >
                    {isAr ? 'مسح السجل' : isEn ? 'Clear' : 'মুছে ফেলুন'}
                  </button>
                )}
              </div>

              {/* Option 5: Bookmarks Management */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#13211c] dark:text-[#e2ece7]">
                    {isAr ? 'الإشارات المرجعية المحفوظة' : isEn ? 'Saved Bookmarks' : 'সংরক্ষিত বুকমার্কস'}
                  </span>
                  <p className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
                    {isAr
                      ? `إجمالي الكلمات المحفوظة: ${bookmarkedWords.length}`
                      : isEn
                      ? `Total bookmarked words: ${bookmarkedWords.length}`
                      : `মোট সংরক্ষিত শব্দ: ${bookmarkedWords.length} টি`}
                  </p>
                </div>
                {bookmarkedWords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setBookmarkedWords([]);
                      triggerToast(
                        isAr ? 'تم مسح الإشارات المرجعية' : isEn ? 'All bookmarks cleared' : 'সব বুকমার্ক মুছে ফেলা হয়েছে'
                      );
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md border border-red-200 dark:border-red-800/60 transition-colors"
                  >
                    {isAr ? 'مسح الإشارات' : isEn ? 'Clear' : 'মুছে ফেলুন'}
                  </button>
                )}
              </div>
            </div>

            {/* Saved Bookmarks Preview List */}
            {bookmarkedWords.length > 0 && (
              <div className="p-4 bg-white dark:bg-[#131f1a] rounded-xl border border-[#cad7d0]/60 dark:border-[#22352c] shadow-xs space-y-2">
                <span className="text-xs font-bold text-[#064e3b] dark:text-emerald-400">
                  {isAr ? 'الكلمات المحفوظة لديك:' : isEn ? 'Your Bookmarked Words:' : 'আপনার বুকমার্ক করা শব্দসমূহ:'}
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {bookmarkedWords.map((bm) => (
                    <button
                      key={bm}
                      type="button"
                      onClick={() => selectWord(bm)}
                      className="px-3 py-1.5 rounded-lg bg-[#edf4f1] dark:bg-[#1a2b24] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[#064e3b] dark:text-emerald-300 font-arabic text-lg font-bold border border-[#cad7d0]/60 dark:border-[#2b4237] transition-colors"
                    >
                      {bm}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* COMMON FOOTER WITH EXACT DISCLAIMER                           */}
        {/* ============================================================== */}
        <div className="w-full mt-6">
          <footer className="flex flex-col space-y-3.5 text-center">
            {/* EXACT VERBATIM DISCLAIMER */}
            <div className="p-3 rounded-lg bg-[#edf4f1] dark:bg-[#131f1a] border border-[#cad7d0]/60 dark:border-[#22352c] text-[#4a5d55] dark:text-[#94a9a0] flex items-start gap-2.5 text-left transition-colors">
              <span className="material-symbols-outlined text-[#b45309] dark:text-amber-400 text-[18px] flex-shrink-0 mt-0.5">
                info
              </span>
              <p className="text-[12px] leading-relaxed text-[#13211c] dark:text-[#e2ece7] font-medium">
                {isAr
                  ? 'ملاحظة خاصة: يرجى مراجعة الكتاب المعتمد أو استشارة المعلم للتأكد من أي تدقيق دقيق.'
                  : isEn
                  ? 'Special Notice: For intricate grammatical subtleties, please cross-check with classical reference books or consult a teacher.'
                  : 'বিশেষ দ্রষ্টব্য: যেকোনো সূক্ষ্ম ভুলের জন্য মূল কিতাব বা শিক্ষকের পরামর্শ মিলিয়ে নেওয়ার অনুরোধ করা হচ্ছে।'}
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex items-center justify-center gap-3 text-xs text-[#b45309] dark:text-amber-400 font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('tahqeeq')}
                className="hover:underline"
              >
                {isAr ? 'التحقيق' : isEn ? 'Tahqeeq Guide' : 'তাহকীক গাইড'}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveTab('tarkeeb')}
                className="hover:underline"
              >
                {isAr ? 'التركيب' : isEn ? 'Tarkeeb' : 'তারকীব'}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="hover:underline"
              >
                {isAr ? 'الإعدادات' : isEn ? 'Settings' : 'সেটিংস'}
              </button>
            </div>

            {/* Copyright Notice */}
            <div className="text-[11px] text-[#4a5d55] dark:text-[#94a9a0]">
              {isAr
                ? '© ۲۰২৫ TAHKIB • التحقيق والتركيب الميسر • جميع الحقوق محفوظة'
                : isEn
                ? '© 2025 TAHKIB • Easy Arabic Tahqeeq & Tarkeeb • All rights reserved'
                : '© ২০২৫ TAHKIB (তাহকীব) • সহজ তাহকীক ও তারকীব • সর্বস্বত্ব সংরক্ষিত'}
            </div>
          </footer>
        </div>
      </main>

      {/* ============================================================== */}
      {/* SEARCH HISTORY MODAL (অনুসন্ধান ইতিহাস ডায়ালগ)                */}
      {/* ============================================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#131f1a] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 border border-[#cad7d0]/80 dark:border-[#22352c] transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-[#cad7d0]/50 dark:border-[#22352c]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#064e3b]/10 dark:bg-emerald-950/60 text-[#064e3b] dark:text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </span>
                <span className="font-bengali-serif font-bold text-base text-[#064e3b] dark:text-emerald-400">
                  {isAr ? 'سجل عمليات التحقيق' : isEn ? 'Recent Search History' : 'সাম্প্রতিক অনুসন্ধান ইতিহাস'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full text-[#4a5d55] dark:text-[#94a9a0] hover:bg-[#edf4f1] dark:hover:bg-[#1a2b24] flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {searchHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#4a5d55] dark:text-[#94a9a0]">
                {isAr ? 'لا يوجد سجل بحث حتى الآن' : isEn ? 'No recent search history yet' : 'কোনো সাম্প্রতিক অনুসন্ধান নেই'}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                {searchHistory.map((word, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectWord(word)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#edf4f1] dark:bg-[#1a2b24] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-transparent dark:border-[#2b4237]/50 transition-colors text-right"
                  >
                    <span className="text-xs text-[#4a5d55] dark:text-[#94a9a0] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      {isAr ? 'تحقيق' : isEn ? 'Analyze' : 'তাহকীক করুন'}
                    </span>
                    <span className="font-arabic font-bold text-xl text-[#064e3b] dark:text-emerald-300 dir-rtl">
                      {word}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#cad7d0]/40 dark:border-[#22352c]">
              {searchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchHistory([]);
                    triggerToast(
                      isAr ? 'تم مسح السجل' : isEn ? 'History cleared' : 'ইতিহাস মুছে ফেলা হয়েছে'
                    );
                  }}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold"
                >
                  {isAr ? 'مسح كل السجل' : isEn ? 'Clear All History' : 'সব ইতিহাস মুছুন'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="ml-auto px-4 py-2 rounded-lg bg-[#064e3b] dark:bg-emerald-700 text-white text-xs font-semibold hover:bg-[#022c22] dark:hover:bg-emerald-600 transition-colors"
              >
                {isAr ? 'إغلاق' : isEn ? 'Close' : 'বন্ধ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SAVED BOOKMARKS MODAL (বুকমার্ক তালিকা ডায়ালগ)                */}
      {/* ============================================================== */}
      {showBookmarksModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#131f1a] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 border border-[#cad7d0]/80 dark:border-[#22352c] transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-[#cad7d0]/50 dark:border-[#22352c]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#fef3c7] dark:bg-amber-950/50 text-[#b45309] dark:text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">bookmark</span>
                </span>
                <span className="font-bengali-serif font-bold text-base text-[#064e3b] dark:text-emerald-400">
                  {isAr ? 'الإشارات المرجعية المحفوظة' : isEn ? 'Saved Bookmarks' : 'সংরক্ষিত শব্দসমূহ (বুকমার্ক)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowBookmarksModal(false)}
                className="w-8 h-8 rounded-full text-[#4a5d55] dark:text-[#94a9a0] hover:bg-[#edf4f1] dark:hover:bg-[#1a2b24] flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {bookmarkedWords.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#4a5d55] dark:text-[#94a9a0]">
                {isAr
                  ? 'لم يتم حفظ أي كلمة في الإشارات المرجعية بعد.'
                  : isEn
                  ? 'No bookmarks saved yet. Click the bookmark icon next to any word.'
                  : 'কোনো বুকমার্ক সংরক্ষিত নেই। যেকোনো শব্দের তাহকীকের পাশে থাকা বুকমার্ক আইকনে চাপ দিন।'}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                {bookmarkedWords.map((word, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#edf4f1] dark:bg-[#1a2b24] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-transparent dark:border-[#2b4237]/50 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setBookmarkedWords((prev) => prev.filter((w) => w !== word));
                        triggerToast(
                          isAr ? 'تم الحذف من الإشارات' : isEn ? 'Removed from bookmarks' : 'বুকমার্ক থেকে সরানো হয়েছে'
                        );
                      }}
                      className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                      title={isAr ? 'حذف' : isEn ? 'Delete' : 'মুছে ফেলুন'}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectWord(word)}
                      className="flex-1 flex items-center justify-end gap-2 pr-1"
                    >
                      <span className="text-xs text-[#4a5d55] dark:text-[#94a9a0]">
                        {isAr ? 'عرض التحقيق' : isEn ? 'View Tahqeeq' : 'তাহকীক দেখুন'}
                      </span>
                      <span className="font-arabic font-bold text-xl text-[#064e3b] dark:text-emerald-300 dir-rtl">
                        {word}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#cad7d0]/40 dark:border-[#22352c]">
              {bookmarkedWords.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBookmarkedWords([]);
                    triggerToast(
                      isAr ? 'تم مسح كل الإشارات المرجعية' : isEn ? 'All bookmarks cleared' : 'সব বুকমার্ক মুছে ফেলা হয়েছে'
                    );
                  }}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold"
                >
                  {isAr ? 'مسح الكل' : isEn ? 'Clear All' : 'সব বুকমার্ক মুছুন'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowBookmarksModal(false)}
                className="ml-auto px-4 py-2 rounded-lg bg-[#064e3b] dark:bg-emerald-700 text-white text-xs font-semibold hover:bg-[#022c22] dark:hover:bg-emerald-600 transition-colors"
              >
                {isAr ? 'إغلاق' : isEn ? 'Close' : 'বন্ধ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FLOATING TOAST NOTIFICATION                                    */}
      {/* ============================================================== */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#283230] dark:bg-[#1a2b24] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg border border-transparent dark:border-[#2b4237] z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* BOTTOM NAVIGATION BAR WITH MULTI-VIEW SYNC                    */}
      {/* [হোম, তাহকীক, তারকীব, সেটিংস]                                 */}
      {/* ============================================================== */}
      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-[#f1fcf8]/90 dark:bg-[#0b1310]/95 backdrop-blur-xl border-t border-[#dfebe7] dark:border-[#1a2b24] shadow-[0_-2px_12px_rgba(6,78,59,0.06)] shadow-lg transition-colors duration-200">
        <div className="flex justify-around items-center h-16 px-2 max-w-4xl mx-auto">
          {/* Home Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center min-w-[64px] h-12 gap-0.5 transition-all ${
              activeTab === 'home'
                ? 'text-[#003527] dark:text-emerald-400 font-semibold'
                : 'text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-400'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">home</span>
            <span className="text-[11px]">{isAr ? 'الرئيسية' : isEn ? 'Home' : 'হোম'}</span>
          </button>

          {/* Tahqeeq Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('tahqeeq')}
            className={`flex flex-col items-center justify-center min-w-[64px] h-12 gap-0.5 transition-all ${
              activeTab === 'tahqeeq'
                ? 'text-[#003527] dark:text-emerald-400 font-semibold'
                : 'text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-400'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">menu_book</span>
            <span className="text-[11px]">{isAr ? 'التحقيق' : isEn ? 'Tahqeeq' : 'তাহকীক'}</span>
          </button>

          {/* Tarkeeb Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('tarkeeb')}
            className={`flex flex-col items-center justify-center min-w-[64px] h-12 gap-0.5 transition-all ${
              activeTab === 'tarkeeb'
                ? 'text-[#003527] dark:text-emerald-400 font-semibold'
                : 'text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-400'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">account_tree</span>
            <span className="text-[11px]">{isAr ? 'التركيب' : isEn ? 'Tarkeeb' : 'তারকীব'}</span>
          </button>

          {/* Settings Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center min-w-[64px] h-12 gap-0.5 transition-all ${
              activeTab === 'settings'
                ? 'text-[#003527] dark:text-emerald-400 font-semibold'
                : 'text-[#4a5d55] dark:text-[#94a9a0] hover:text-[#064e3b] dark:hover:text-emerald-400'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
            <span className="text-[11px]">{isAr ? 'الإعدادات' : isEn ? 'Settings' : 'সেটিংস'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
