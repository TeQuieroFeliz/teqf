export type Lang = 'en' | 'es';

export type CustomFurnitureCategory = { key: string; en: string; es: string };

// Predefined categories — stable keys, translated labels.
// Keys are stored in Firestore; labels are derived at render time via getCategoryLabel().
export const PREDEFINED_FURNITURE_CATEGORIES: readonly CustomFurnitureCategory[] = [
  { key: 'bar_back_bar',    en: 'Bar & Back Bar',   es: 'Barra y Barra Posterior' },
  { key: 'cocktail_table',  en: 'Cocktail Table',   es: 'Mesa de Cócteles'        },
  { key: 'sala_lounge',     en: 'Lounge Seating',   es: 'Área de Descanso'        },
  { key: 'chairs',          en: 'Chairs',            es: 'Sillas'                  },
  { key: 'cocktail_chairs', en: 'Cocktail Chairs',  es: 'Sillas de Cócteles'      },
  { key: 'tables',          en: 'Tables',            es: 'Mesas'                   },
  { key: 'linens',          en: 'Linens',            es: 'Mantelerías'             },
];

export const PREDEFINED_CATEGORY_KEYS = PREDEFINED_FURNITURE_CATEGORIES.map(c => c.key);

// Maps legacy Italian Firestore labels (any case) to predefined keys.
// Used by getCategoryLabel() so items translate correctly before migration runs.
const ITALIAN_TO_KEY: Record<string, string> = {
  'tavoli':          'tables',
  'sedie':           'chairs',
  'sedie cocktail':  'cocktail_chairs',
  'sala lounge':     'sala_lounge',
  'bar & back bar':  'bar_back_bar',
  'cocktail table':  'cocktail_table',
  'tovaglie':        'linens',
};

// Returns the translated label for a category key or legacy Italian label.
// Resolution order:
//   1. Predefined key (already migrated)
//   2. Custom category key
//   3. Italian legacy label → resolved to predefined key → translated
//   4. Raw value (never crashes)
export function getCategoryLabel(
  key: string,
  lang: Lang,
  custom: CustomFurnitureCategory[] = []
): string {
  const pre = PREDEFINED_FURNITURE_CATEGORIES.find(c => c.key === key);
  if (pre) return pre[lang];
  const cust = custom.find(c => c.key === key);
  if (cust) return cust[lang] || cust.en || key;
  const resolved = ITALIAN_TO_KEY[key.toLowerCase()];
  if (resolved) {
    const mappedPre = PREDEFINED_FURNITURE_CATEGORIES.find(c => c.key === resolved);
    if (mappedPre) return mappedPre[lang];
  }
  return key;
}
