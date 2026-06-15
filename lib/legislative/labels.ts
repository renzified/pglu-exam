import type { DocumentType, TypeFilterOption } from "./types";

const LABELS: Record<DocumentType, string> = {
  ordinance: "Ordinance",
  resolution: "Resolution",
};

export function formatDocumentType(type: DocumentType): string {
  return LABELS[type];
}

const TYPE_FILTER_LABELS: Record<TypeFilterOption, string> = {
  all: "All types",
  ordinance: "Ordinances",
  resolution: "Resolutions",
};

export function formatTypeFilterOption(option: TypeFilterOption): string {
  return TYPE_FILTER_LABELS[option];
}

export function formatDatePassed(isoDate: string): string {
  const ms = Date.parse(isoDate);
  if (Number.isNaN(ms)) return isoDate;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(ms));
}
