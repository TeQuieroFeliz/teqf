export type Lang = 'en' | 'es';

export type CustomFurnitureCategory = { key: string; en: string; es: string };

// Predefined categories — stable keys, translated labels.
// Keys are stored in Firestore; labels are derived at render time via getCategoryLabel().
export const PREDEFINED_FURNITURE_CATEGORIES: readonly CustomFurnitureCategory[] = [
  { key: 'bar_back_bar',   en: 'Bar & Back Bar', es: 'Bar y Back Bar'  },
  { key: 'cocktail_table', en: 'Cocktail Table',  es: 'Mesa Cóctel'    },
  { key: 'sala_lounge',    en: 'Lounge',           es: 'Sala Lounge'    },
  { key: 'chairs',         en: 'Chairs',            es: 'Sillas'         },
  { key: 'tables',         en: 'Tables',            es: 'Mesas'          },
];

export const PREDEFINED_CATEGORY_KEYS = PREDEFINED_FURNITURE_CATEGORIES.map(c => c.key);

// Returns the translated label for a category key.
// Checks predefined list first, then caller-supplied custom categories, then falls
// back to the raw string (handles legacy unmigrated values — never crashes).
export function getCategoryLabel(
  key: string,
  lang: Lang,
  custom: CustomFurnitureCategory[] = []
): string {
  const pre = PREDEFINED_FURNITURE_CATEGORIES.find(c => c.key === key);
  if (pre) return pre[lang];
  const cust = custom.find(c => c.key === key);
  if (cust) return cust[lang] || cust.en || key;
  return key;
}
