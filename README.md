# Legislative Document Archiving Module

## Applicant

**Renz Carlo A. Salanga**

## Overview

Simple web application for the **Legislative Tracking and Monitoring Unit** to archive **ordinances** and **resolutions** passed by the **Sangguniang Panlalawigan**. Records persist in the browser using **`localStorage`** (no database server required).

## Technologies

- [Next.js](https://nextjs.org/) (App Router) — React framework
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [shadcn/ui](https://ui.shadcn.com/) (Base UI primitives)
- [react-hook-form](https://react-hook-form.com/) + [Zod](https://zod.dev/) for validation
- [Sonner](https://sonner.emilkowal.ski/) for toast notifications
- Browser **`localStorage`** for persistence

## Running the application

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open a modern browser at [http://localhost:3000](http://localhost:3000).

4. Production build (optional):

   ```bash
   npm run build
   npm start
   ```

### Optional environment variable

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_LEGISLATIVE_STORE` | Currently only `localStorage` is implemented. The factory in `lib/legislative/repository-factory.ts` is the extension point for future values (e.g. an HTTP-backed store). |

## Implemented features

- **List** ordinances and resolutions in a table (default sort: date passed, newest first).
- **Pagination**: the table loads **one page at a time** (default 10 rows) via `LegislativeRepository.list` with `page` / `pageSize`; the UI shows range text and Previous/Next controls.
- **Create** a new document via dialog form.
- **View** full details of a record (including unique record ID).
- **Edit** an existing record via the same form.
- **Delete** with **confirmation** (`AlertDialog`) before removal.
- **Automatic save** to `localStorage` after every successful create, update, or delete.
- **Immediate list refresh** after each operation (and when search/filter inputs change).
- **Search** by document number or title (case-insensitive, substring).
- **Filter** by document type (all / ordinance / resolution).
- **Validation** of required fields and document number format `0000-0000` (e.g. `0001-2026`).
- **Duplicate prevention**: the same document number cannot be reused under the same document type.
- **Corrupt or invalid** stored JSON is treated as an empty list so the app keeps working.
- **Swappable persistence**: UI depends on the `LegislativeRepository` interface; `LocalStorageLegislativeRepository` is one implementation swap via the factory when a database or API is added.

## Known limitations

- Data is **per origin, per browser profile** (same machine + browser as specified for `localStorage`); it is **not** synced across devices or users.
- **Storage quota** applies (typically on the order of a few megabytes per origin).
- The home page is a **client-side** module: the server render does not read `localStorage`; the list appears after the client loads.
- **`list` pagination**: the repository returns only the requested slice, but `localStorage` still **reads and parses the full JSON blob** each time; true partial file reads are not possible; a database backend can use real offset.
- **No authentication** or audit trail or roles; suitable only for local/demo or controlled intranet use unless extended.
- **Bad SEO** contents are not searchable on search engines because data cannot be server rendered because of the required source of data.
- **No unit testing** features are manually tested unless a teste suite is implemented.

## Project structure (high level)

- `app/` - Next.js App Router layout and page
- `components/legislative/` - Feature UI
- `lib/legislative/` - Types, Zod schemas, repository interface, `localStorage` implementation, factory
