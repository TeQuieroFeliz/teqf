'use client';

import { useLangContext, type Lang } from '@/context/LangContext';
import { useCallback } from 'react';

export type { Lang };

export function useT(dicts: { en: Record<string, string>; es: Record<string, string> }) {
  const { lang, setLang } = useLangContext();

  const t = useCallback(
    (key: string): string => dicts[lang][key] ?? dicts.en[key] ?? key,
    [lang, dicts]
  );

  return { t, lang, setLang };
}
