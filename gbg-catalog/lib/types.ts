export interface ProductSummary {
  productId: number;
  barcode: string;
  description: string;
  categoryRaw: string | null;
  side: string | null;
  salePrice: number | null;
  stockAth: boolean;
  stockThe: boolean;
}

export interface OemNumberRow {
  oemCode: string;
  netOemCode: string | null;
}

export interface CrossRefRow {
  similarCode: string;
}

export interface ApplicationRow {
  brandName: string;
  modelRaw: string;
  modelCode: string;
  modelGroup: string;
}

export interface PartDetail extends ProductSummary {
  oemNumbers: OemNumberRow[];
  crossRefs: CrossRefRow[];
  applications: ApplicationRow[];
}

export interface BrandSummary {
  brandId: number;
  nameRaw: string;
  partsCount: number;
}

export interface ModelGroupSummary {
  modelGroup: string;
  partsCount: number;
}

export interface ModelCardSummary {
  modelCode: string;
  modelName: string;
  constrYearFrom: number | null;
  constrYearTo: number | null;
  partsCount: number;
}

export interface ModelDetail {
  modelGroup: string;
  modelName: string;
  constrYearFrom: number | null;
  constrYearTo: number | null;
}

export interface CategorySummary {
  category: string;
  partsCount: number;
}
