export class DuplicateDocumentNumberError extends Error {
  constructor() {
    super(
      "A document with this number already exists for the selected document type."
    );
    this.name = "DuplicateDocumentNumberError";
  }
}

export class LegislativeNotFoundError extends Error {
  constructor(id: string) {
    super(`Legislative document not found: ${id}`);
    this.name = "LegislativeNotFoundError";
  }
}
