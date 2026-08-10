// frontend/components/LanguageProvider.js
//
// App-wide language selection, persisted to localStorage. Any
// component inside <LanguageProvider> can call useLanguage() to get:
//
//   - t(key): translated string for the current language, falling
//     back to English (en-US) if the key is missing in that language
//     — so a partially-translated language never shows a blank string
//     or a raw key like "newChat" on screen.
//   - language: current language code, e.g. "hi"
//   - setLanguage(code): switch language, persists immediately

import { createContext, useContext, useEffect, useState } from "react";

import { TRANSLATIONS, DEFAULT_LANGUAGE } from "../data/translations";

const STORAGE_KEY = "techmart_language";

const LanguageContext = createContext(null);

export function useLanguage() {

  const ctx = useContext(LanguageContext);

  if (!ctx) {

    throw new Error("useLanguage must be used inside a <LanguageProvider>");

  }

  return ctx;

}

export function LanguageProvider({ children }) {

  // Starts as the default so server-rendered HTML and the first client
  // render match (avoids a hydration mismatch warning); the real saved
  // preference is loaded from localStorage right after mount.
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {

    try {

      const saved = window.localStorage.getItem(STORAGE_KEY);

      if (saved && TRANSLATIONS[saved]) {

        setLanguageState(saved);

      }

    } catch (e) {

      // localStorage can throw in some privacy modes — language just
      // stays at the default for this session, which is a fine fallback
    }

  }, []);

  const setLanguage = (code) => {

    if (!TRANSLATIONS[code]) return;

    setLanguageState(code);

    try {

      window.localStorage.setItem(STORAGE_KEY, code);

    } catch (e) {

      // Same as above — non-fatal if storage isn't available
    }

  };

  const t = (key) => {

    const current = TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANGUAGE];

    return current[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;

  };

  return (

    <LanguageContext.Provider value = {{ language, setLanguage, t }}>

      {children}

    </LanguageContext.Provider>

  );

}