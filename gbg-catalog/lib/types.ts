export interface ProductSummary {
  productId: number;
  barcode: string;
  description: string;
  categoryRaw: string | null;
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

export interface ModelSummary {
  modelCode: string;
  modelRaw: string;
  partsCount: number;
}
