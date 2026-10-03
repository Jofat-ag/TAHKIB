export interface TahqeeqData {
  word: string;
  phonetic: string;
  wordType: string; // e.g. "ফে'ল (فِعْل)"
  seegah: string; // ছিগাহ বাংলায়
  seegahAr: string; // ছিগাহ আরবিতে
  seegahEn?: string; // ছিগাহ ইংরেজিতে
  bahath: string; // বহছ বাংলায়
  bahathAr: string; // বহছ আরবিতে
  bahathEn?: string; // বহছ ইংরেজিতে
  baab: string; // বাব বাংলায়
  baabAr: string; // বাব আরবিতে
  baabEn?: string; // বাব ইংরেজিতে
  masdar: string; // মাসদার
  masdarMeaning: string; // মাসদারের অর্থ (বাংলা)
  masdarMeaningEn?: string; // মাসদারের অর্থ (ইংরেজি)
  maddah: string; // মাদ্দা বাংলায়
  maddahAr: string; // মাদ্দা আরবিতে
  maddahEn?: string; // মাদ্দা ইংরেজিতে
  rootLetters: string[]; // ৩টি বা ৪টি হরফ যেমন ['ن', 'ص', 'ر']
  jins: string; // জিনস বাংলায়
  jinsAr?: string; // জিনস আরবিতে (যেমন: صَحِيح)
  jinsType: string; // জিনসের ব্যাখ্যা (যেমন: ছহীহ - ত্রুটিমুক্ত মূলবর্ণ)
  jinsEn?: string; // জিনস ইংরেজিতে
  jinsTypeEn?: string; // জিনসের ব্যাখ্যা (ইংরেজি)
  meaning: string; // বাংলা অর্থ
  meaningEn: string; // ইংরেজি অর্থ
  meaningAr?: string; // আরবি ব্যাখ্যা / অর্থ
  tarkeebNote?: string; // ইলমে নাহুর সংক্ষিপ্ত তারকীব (যৌগিক ক্রিয়া বা বাক্যের ক্ষেত্রে)
  tarkeebNoteAr?: string; // نحو تركيب بالعربية
  tarkeebNoteEn?: string; // English syntax note
}

export type ActiveTab = 'home' | 'tahqeeq' | 'tarkeeb' | 'settings';
export type ArabicFontSize = 'normal' | 'medium' | 'large';
export type AppLanguage = 'bn' | 'ar' | 'en';

export interface AppSettings {
  arabicFontSize: ArabicFontSize;
  autoAnalyzeOnChip: boolean;
  appLanguage: AppLanguage;
  darkMode: boolean;
}
