'use client';

// PART-3: IT/ES language switch, persisted to localStorage('teqf.lang')
import { useCallback, useEffect, useState } from 'react';

export type Lang = 'it' | 'es';
const LANG_KEY = 'teqf.lang';

export function useT(dicts: { it: Record<string, string>; es: Record<string, string> }) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    const stored = (localStorage.getItem(LANG_KEY) as Lang) ?? 'es';
    setLangState(stored === 'it' ? 'it' : 'es');
  }, []);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: string): string => dicts[lang][key] ?? dicts.es[key] ?? key,
    [lang, dicts]
  );

  return { t, lang, setLang };
}
