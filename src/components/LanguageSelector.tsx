'use client';

import { useLangContext } from '@/context/LangContext';

export function LanguageSelector() {
  const { lang, setLang } = useLangContext();

  return (
    <div
      className="flex items-center rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--tqf-beige-border)' }}
    >
      {(['en', 'es'] as const).map((opt, idx) => (
        <button
          key={opt}
          type="button"
          onClick={() => setLang(opt)}
          className="text-xs px-2.5 py-1.5 transition-colors"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: lang === opt ? 600 : 400,
            background: lang === opt ? 'var(--tqf-bordeaux)' : 'white',
            color: lang === opt ? 'white' : 'var(--tqf-muted)',
            borderLeft: idx > 0 ? '1px solid var(--tqf-beige-border)' : 'none',
          }}
        >
          {opt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
