'use client';

import { useLangContext } from '@/context/LangContext';
import EN from '@/locales/en.json';
import ES from '@/locales/es.json';
import { useCallback } from 'react';

type Dict = typeof EN;

export function useI18n() {
  const { lang, setLang } = useLangContext();
  const dict: Dict = lang === 'es' ? (ES as Dict) : EN;

  const t = useCallback(
    (key: keyof Dict, vars?: Record<string, string | number>): string => {
      let str = (dict[key] as string) ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      return str;
    },
    [dict]
  );

  return { t, lang, setLang };
}
