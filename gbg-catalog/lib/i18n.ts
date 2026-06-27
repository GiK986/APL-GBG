export type LanguageId = '32' | '4';

export const DEFAULT_LID: LanguageId = '32';

const DICTIONARIES = {
  '32': {
    headerTitle: 'Едрогабаритни части',
    home: 'Начало',
    searchPlaceholder: 'Търси по OEM номер или артикулен номер...',
    searchButton: 'Търси',
    addToBasket: 'Добави',
    addedToBasket: 'Добавено',
    noResults: 'Няма намерени артикули',
    brands: 'Марки',
    series: 'Серии',
    models: 'Модели',
    parts: 'Части',
    available: 'Наличен',
    unavailable: 'Неналичен',
    oemNumbers: 'OE номера',
    similarParts: 'Сходни артикули',
    usedIn: 'Превозни средства',
    uncategorized: 'Други',
    loadingMore: 'Зареждане...',
    categories: 'Категории',
    clearFilters: 'Изчисти',
    categorySearchPlaceholder: 'Търси категория...',
    noCategoryMatch: 'Няма съвпадащи категории',
    showOnlyAvailable: 'Покажи само наличните',
    partNumberLabel: 'Артикулен номер',
    descriptionLabel: 'Описание',
    categoryLabel: 'Категория',
    priceLabel: 'Цена на артикул',
  },
  '4': {
    headerTitle: 'Body parts',
    home: 'Home',
    searchPlaceholder: 'Search by OEM number or item number...',
    searchButton: 'Search',
    addToBasket: 'Add',
    addedToBasket: 'Added',
    noResults: 'No parts found',
    brands: 'Brands',
    series: 'Series',
    models: 'Models',
    parts: 'parts',
    available: 'Available',
    unavailable: 'Unavailable',
    oemNumbers: 'OE numbers',
    similarParts: 'Similar parts',
    usedIn: 'Vehicles',
    uncategorized: 'Other',
    loadingMore: 'Loading...',
    categories: 'Categories',
    clearFilters: 'Clear',
    categorySearchPlaceholder: 'Search category...',
    noCategoryMatch: 'No matching categories',
    showOnlyAvailable: 'Show only available',
    partNumberLabel: 'Part number',
    descriptionLabel: 'Description',
    categoryLabel: 'Category',
    priceLabel: 'Price',
  },
} as const;

export function getDictionary(lid: string | undefined) {
  return lid === '4' ? DICTIONARIES['4'] : DICTIONARIES['32'];
}

export function getLanguageId(lid: string | string[] | undefined): LanguageId {
  return lid === '4' ? '4' : DEFAULT_LID;
}
