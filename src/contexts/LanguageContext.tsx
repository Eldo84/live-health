import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trackLanguageChange } from "../lib/analytics";

export type Language = "en" | "fr" | "es" | "ar" | "de" | "pt" | "it" | "ru" | "ja" | "zh";

export const SUPPORTED_LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Import translations
import enTranslations from "../locales/en.json";
import frTranslations from "../locales/fr.json";
import esTranslations from "../locales/es.json";
import arTranslations from "../locales/ar.json";
import deTranslations from "../locales/de.json";
import ptTranslations from "../locales/pt.json";
import itTranslations from "../locales/it.json";
import ruTranslations from "../locales/ru.json";
import jaTranslations from "../locales/ja.json";
import zhTranslations from "../locales/zh.json";

const translations: Record<Language, any> = {
  en: enTranslations,
  fr: frTranslations,
  es: esTranslations,
  ar: arTranslations,
  de: deTranslations,
  pt: ptTranslations,
  it: itTranslations,
  ru: ruTranslations,
  ja: jaTranslations,
  zh: zhTranslations,
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Get from localStorage or default to English
    const saved = localStorage.getItem("app_language") as Language;
    return saved && SUPPORTED_LANGUAGES.some(l => l.code === saved) ? saved : "en";
  });

  useEffect(() => {
    // Save to localStorage when language changes
    localStorage.setItem("app_language", language);
    // Update document direction for RTL languages
    if (language === "ar") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    trackLanguageChange(lang);
  }, []);

  const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || path;
  };

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[language], key) || getNestedValue(translations.en, key) || key;
    
    if (params) {
      return Object.entries(params).reduce(
        (text, [paramKey, paramValue]) => text.replace(`{{${paramKey}}}`, String(paramValue)),
        translation
      );
    }
    
    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

