import type {
  CreateLegislativeInput,
  LegislativeDocument,
  LegislativeListFilters,
  LegislativeListPage,
  UpdateLegislativeInput,
} from "./types";

/**
 * Persistence boundary for legislative documents.
 * Swap implementations (e.g. REST API + database) without changing UI code.
 */
export interface LegislativeRepository {
  list(filters?: LegislativeListFilters): Promise<LegislativeListPage>;
  getById(id: string): Promise<LegislativeDocument | null>;
  create(input: CreateLegislativeInput): Promise<LegislativeDocument>;
  update(id: string, input: UpdateLegislativeInput): Promise<LegislativeDocument>;
  delete(id: string): Promise<void>;
}
