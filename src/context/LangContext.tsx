'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'es';

const LANG_KEY = 'teqf.lang';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangContextValue>({ lang: 'en', setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY) as Lang | null;
    if (stored === 'en' || stored === 'es') setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLangContext() {
  return useContext(LangContext);
}
