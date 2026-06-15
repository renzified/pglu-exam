import { legislativeFormSchema } from "./schema";
import {
  DuplicateDocumentNumberError,
  LegislativeNotFoundError,
} from "./errors";
import type { LegislativeRepository } from "./repository";
import type {
  CreateLegislativeInput,
  LegislativeDocument,
  LegislativeListFilters,
  LegislativeListPage,
  UpdateLegislativeInput,
} from "./types";

const STORAGE_KEY = "legislative-documents:v1";

function safeParseDocuments(raw: string | null): LegislativeDocument[] {
  if (raw == null || raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLegislativeDocument);
  } catch {
    return [];
  }
}

function isLegislativeDocument(value: unknown): value is LegislativeDocument {
  if (value == null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    (v.documentType === "ordinance" || v.documentType === "resolution") &&
    typeof v.documentNumber === "string" &&
    typeof v.title === "string" &&
    typeof v.datePassed === "string" &&
    typeof v.author === "string"
  );
}

function sortDocuments(rows: LegislativeDocument[]): LegislativeDocument[] {
  return [...rows].sort((a, b) => {
    const da = Date.parse(a.datePassed);
    const db = Date.parse(b.datePassed);
    if (db !== da) return db - da;
    return a.documentNumber.localeCompare(b.documentNumber);
  });
}

export class LocalStorageLegislativeRepository implements LegislativeRepository {
  private readAll(): LegislativeDocument[] {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return safeParseDocuments(raw);
  }

  private writeAll(documents: LegislativeDocument[]): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }

  private findDuplicate(
    documentType: LegislativeDocument["documentType"],
    documentNumber: string,
    excludeId?: string
  ): LegislativeDocument | undefined {
    return this.readAll().find(
      (d) =>
        d.documentType === documentType &&
        d.documentNumber === documentNumber &&
        d.id !== excludeId
    );
  }

  async list(filters?: LegislativeListFilters): Promise<LegislativeListPage> {
    let rows = this.readAll();

    const type = filters?.documentType;
    if (type && type !== "all") {
      rows = rows.filter((r) => r.documentType === type);
    }

    const q = filters?.search?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.documentNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
      );
    }

    const sorted = sortDocuments(rows);
    const total = sorted.length;

    const pageSize = Math.max(
      1,
      Math.min(100, Math.floor(filters?.pageSize ?? 10))
    );
    const maxPage = total === 0 ? 1 : Math.ceil(total / pageSize);
    const requestedPage = Math.max(1, Math.floor(filters?.page ?? 1));
    const page = Math.min(requestedPage, maxPage);
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }

  async getById(id: string): Promise<LegislativeDocument | null> {
    const found = this.readAll().find((d) => d.id === id);
    return found ?? null;
  }

  async create(input: CreateLegislativeInput): Promise<LegislativeDocument> {
    const parsed = legislativeFormSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message =
        Object.values(first).flat()[0] ?? "Validation failed for new document.";
      throw new Error(message);
    }

    const data = parsed.data;
    if (this.findDuplicate(data.documentType, data.documentNumber)) {
      throw new DuplicateDocumentNumberError();
    }

    const doc: LegislativeDocument = {
      id: crypto.randomUUID(),
      ...data,
    };

    const next = [...this.readAll(), doc];
    this.writeAll(next);
    return doc;
  }

  async update(
    id: string,
    input: UpdateLegislativeInput
  ): Promise<LegislativeDocument> {
    const parsed = legislativeFormSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message =
        Object.values(first).flat()[0] ??
        "Validation failed for updated document.";
      throw new Error(message);
    }

    const data = parsed.data;
    if (this.findDuplicate(data.documentType, data.documentNumber, id)) {
      throw new DuplicateDocumentNumberError();
    }

    const rows = this.readAll();
    const index = rows.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new LegislativeNotFoundError(id);
    }

    const updated: LegislativeDocument = { id, ...data };
    const next = [...rows.slice(0, index), updated, ...rows.slice(index + 1)];
    this.writeAll(next);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const rows = this.readAll();
    const next = rows.filter((d) => d.id !== id);
    if (next.length === rows.length) {
      throw new LegislativeNotFoundError(id);
    }
    this.writeAll(next);
  }
}
