"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DuplicateDocumentNumberError } from "@/lib/legislative/errors";
import {
  formatDatePassed,
  formatDocumentType,
  formatTypeFilterOption,
} from "@/lib/legislative/labels";
import { getLegislativeRepository } from "@/lib/legislative/repository-factory";
import {
  legislativeFormSchema,
  type LegislativeFormValues,
} from "@/lib/legislative/schema";
import type { LegislativeDocument, TypeFilterOption } from "@/lib/legislative/types";
import { cn } from "@/lib/utils";

const clientSnapshot = () => true;
const serverSnapshot = () => false;
const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot);
}

const defaultFormValues: LegislativeFormValues = {
  documentType: "ordinance",
  documentNumber: "",
  title: "",
  datePassed: "",
  author: "",
};

const PAGE_SIZE = 10;

function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="text-muted-foreground flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>
        Showing{" "}
        <span className="text-foreground font-medium">
          {from}-{to}
        </span>{" "}
        of <span className="text-foreground font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="text-foreground hidden sm:inline">
          Page {page} of {maxPage}
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="size-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= maxPage}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            Next
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LegislativeDocumentsPage() {
  const repo = useMemo(() => getLegislativeRepository(), []);
  const isClient = useIsClient();

  const [documents, setDocuments] = useState<LegislativeDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilterOption>("all");

  const [viewDoc, setViewDoc] = useState<LegislativeDocument | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LegislativeDocument | null>(
    null
  );

  const form = useForm<LegislativeFormValues>({
    resolver: zodResolver(legislativeFormSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await repo.list({
        search: search.trim() || undefined,
        documentType: typeFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setDocuments(result.items);
      setTotal(result.total);
      if (result.page !== page) {
        setPage(result.page);
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not load documents.");
    } finally {
      setLoading(false);
    }
  }, [repo, search, typeFilter, page]);

  useEffect(() => {
    if (!isClient) return;
    const id = window.requestAnimationFrame(() => {
      void refresh();
    });
    return () => window.cancelAnimationFrame(id);
  }, [isClient, refresh]);

  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    form.reset(defaultFormValues);
    setFormOpen(true);
  };

  const openEdit = (doc: LegislativeDocument) => {
    setFormMode("edit");
    setEditingId(doc.id);
    form.reset({
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      title: doc.title,
      datePassed: doc.datePassed,
      author: doc.author,
    });
    setFormOpen(true);
    setViewDoc(null);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (formMode === "create") {
        await repo.create(values);
        toast.success("Document saved.");
      } else if (editingId) {
        await repo.update(editingId, values);
        toast.success("Document updated.");
      }
      setFormOpen(false);
      await refresh();
    } catch (e) {
      if (e instanceof DuplicateDocumentNumberError) {
        toast.error(e.message);
        return;
      }
      if (e instanceof Error) {
        toast.error(e.message);
        return;
      }
      toast.error("Something went wrong while saving.");
    }
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await repo.delete(deleteTarget.id);
      toast.success("Document deleted.");
      setDeleteTarget(null);
      if (viewDoc?.id === deleteTarget.id) setViewDoc(null);
      await refresh();
    } catch (e) {
      if (e instanceof Error) {
        toast.error(e.message);
        return;
      }
      toast.error("Could not delete this document.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Legislative Document Archiving
          </h1>
          <p className="text-muted-foreground text-sm text-pretty">
            Record and manage ordinances and resolutions passed by the
            Sangguniang Panlalawigan.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="shrink-0">
          <PlusIcon data-icon="inline-start" />
          Add document
        </Button>
      </header>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg">Documents</CardTitle>
            <CardDescription>
              Search by number or title, filter by type, then view or edit a
              row.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[320px] sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Search number or title…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search by document number or title"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                if (v === "all" || v === "ordinance" || v === "resolution") {
                  setTypeFilter(v);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue>
                  {(value) =>
                    value === "all" ||
                    value === "ordinance" ||
                    value === "resolution"
                      ? formatTypeFilterOption(value)
                      : String(value ?? "")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="ordinance">Ordinances</SelectItem>
                <SelectItem value="resolution">Resolutions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!isClient ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : loading ? (
            <p className="text-muted-foreground text-sm">Updating list…</p>
          ) : total === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
              <FileTextIcon className="size-8 opacity-50" />
              <p>No documents match your filters yet.</p>
              <Button type="button" variant="outline" size="sm" onClick={openCreate}>
                Add your first document
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead className="w-[130px]">Number</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-[140px]">Date passed</TableHead>
                      <TableHead className="min-w-[160px]">Author</TableHead>
                      <TableHead className="w-[200px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatDocumentType(doc.documentType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {doc.documentNumber}
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate">
                          {doc.title}
                        </TableCell>
                        <TableCell>{formatDatePassed(doc.datePassed)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {doc.author}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewDoc(doc)}
                            >
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(doc)}
                              aria-label={`Edit ${doc.documentNumber}`}
                            >
                              <PencilIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(doc)}
                              aria-label={`Delete ${doc.documentNumber}`}
                            >
                              <Trash2Icon />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          {viewDoc && (
            <>
              <DialogHeader>
                <DialogTitle>{viewDoc.title}</DialogTitle>
                <DialogDescription>
                  {formatDocumentType(viewDoc.documentType)} ·{" "}
                  <span className="font-mono">{viewDoc.documentNumber}</span>
                </DialogDescription>
              </DialogHeader>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Date passed</dt>
                  <dd className="font-medium">
                    {formatDatePassed(viewDoc.datePassed)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Author or sponsor</dt>
                  <dd className="font-medium">{viewDoc.author}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Record ID</dt>
                  <dd className="font-mono text-xs break-all">{viewDoc.id}</dd>
                </div>
              </dl>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setViewDoc(null)}>
                  Close
                </Button>
                <Button type="button" onClick={() => openEdit(viewDoc)}>
                  Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent
          className="sm:max-w-lg"
          fullScreenMobile
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "New document" : "Edit document"}
            </DialogTitle>
            <DialogDescription>
              Required fields are validated before saving. Changes are written to
              local storage immediately.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="documentType">Document type</Label>
              <Controller
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      if (v === "ordinance" || v === "resolution") {
                        field.onChange(v);
                      }
                    }}
                  >
                    <SelectTrigger
                      id="documentType"
                      className="w-full"
                      aria-invalid={!!form.formState.errors.documentType}
                    >
                      <SelectValue placeholder="Document type">
                        {(value) =>
                          value === "ordinance" || value === "resolution"
                            ? formatDocumentType(value)
                            : "Document type"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ordinance">Ordinance</SelectItem>
                      <SelectItem value="resolution">Resolution</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.documentType && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.documentType.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="documentNumber">Document number</Label>
              <Input
                id="documentNumber"
                placeholder="0001-2026"
                className={cn(form.formState.errors.documentNumber && "border-destructive")}
                aria-invalid={!!form.formState.errors.documentNumber}
                {...form.register("documentNumber")}
              />
              {form.formState.errors.documentNumber && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.documentNumber.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Title or subject</Label>
              <Input
                id="title"
                className={cn(form.formState.errors.title && "border-destructive")}
                aria-invalid={!!form.formState.errors.title}
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="datePassed">Date passed</Label>
              <Input
                id="datePassed"
                type="date"
                className={cn(
                  form.formState.errors.datePassed && "border-destructive"
                )}
                aria-invalid={!!form.formState.errors.datePassed}
                {...form.register("datePassed")}
              />
              {form.formState.errors.datePassed && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.datePassed.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author">Author or sponsor</Label>
              <Input
                id="author"
                className={cn(form.formState.errors.author && "border-destructive")}
                aria-invalid={!!form.formState.errors.author}
                {...form.register("author")}
              />
              {form.formState.errors.author && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.author.message}
                </p>
              )}
            </div>

            <DialogFooter className="max-sm:rounded-none">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  This will permanently remove{" "}
                  <span className="font-mono font-medium">
                    {deleteTarget.documentNumber}
                  </span>{" "}
                  ({formatDocumentType(deleteTarget.documentType)}). This action cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
