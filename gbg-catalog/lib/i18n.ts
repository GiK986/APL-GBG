export type LanguageId = '32' | '4';

export const DEFAULT_LID: LanguageId = '32';

const DICTIONARIES = {
  '32': {
    searchPlaceholder: 'Търси по баркод, OE номер или описание...',
    searchButton: 'Търси',
    addToBasket: 'Добави',
    addedToBasket: 'Добавено',
    noResults: 'Няма намерени артикули',
    brands: 'Марки',
    models: 'Модели',
    parts: 'части',
    inStockAthens: 'Атина',
    inStockThessaloniki: 'Солун',
    oemNumbers: 'OE номера',
    similarParts: 'Сходни артикули',
    usedIn: 'Влиза в',
  },
  '4': {
    searchPlaceholder: 'Search by barcode, OE number or description...',
    searchButton: 'Search',
    addToBasket: 'Add',
    addedToBasket: 'Added',
    noResults: 'No parts found',
    brands: 'Brands',
    models: 'Models',
    parts: 'parts',
    inStockAthens: 'Athens',
    inStockThessaloniki: 'Thessaloniki',
    oemNumbers: 'OE numbers',
    similarParts: 'Similar parts',
    usedIn: 'Used in',
  },
} as const;

export function getDictionary(lid: string | undefined) {
  return lid === '4' ? DICTIONARIES['4'] : DICTIONARIES['32'];
}

export function getLanguageId(lid: string | string[] | undefined): LanguageId {
  return lid === '4' ? '4' : DEFAULT_LID;
}
