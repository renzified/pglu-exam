import { z } from "zod";

import { DOCUMENT_TYPES } from "./types";

export const documentTypeSchema = z.enum(DOCUMENT_TYPES);

export const legislativeFormSchema = z.object({
  documentType: documentTypeSchema,
  documentNumber: z
    .string()
    .trim()
    .min(1, "Document number is required.")
    .regex(
      /^\d{4}-\d{4}$/,
      "Document number must match 0000-0000 (e.g. 0001-2026)."
    ),
  title: z
    .string()
    .trim()
    .min(1, "Title or subject is required.")
    .max(500, "Title must be at most 500 characters."),
  datePassed: z
    .string()
    .min(1, "Date passed is required.")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Date passed must be a valid date.",
    }),
  author: z
    .string()
    .trim()
    .min(1, "Author or sponsor is required.")
    .max(200, "Author must be at most 200 characters."),
});

export type LegislativeFormValues = z.infer<typeof legislativeFormSchema>;
