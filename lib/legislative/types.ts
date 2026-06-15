export const DOCUMENT_TYPES = ["ordinance", "resolution"] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface LegislativeDocument {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  title: string;
  /** ISO date string yyyy-mm-dd */
  datePassed: string;
  author: string;
}

export type CreateLegislativeInput = Omit<LegislativeDocument, "id">;

export type UpdateLegislativeInput = CreateLegislativeInput;

export type TypeFilterOption = DocumentType | "all";

export interface LegislativeListFilters {
  search?: string;
  documentType?: TypeFilterOption;
  /** 1-based page index */
  page?: number;
  pageSize?: number;
}

export interface LegislativeListPage {
  items: LegislativeDocument[];
  total: number;
  /** Effective page used after clamping to valid range */
  page: number;
  pageSize: number;
}
