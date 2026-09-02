
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Plus,
  Library,
  CheckCircle2,
  BookMarked,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { addBook, addCopies } from "../actions";

type Props = {
  searchParams: Promise<{
    q?: string;
    add?: string;
  }>;
};

export default async function LibrarianBooksPage({ searchParams }: Props) {
  await requireRole(["LIBRARIAN", "ADMIN"]);

  const { q = "", add } = await searchParams;

  const books = await prisma.book.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { author: { contains: q, mode: "insensitive" } },
            { isbn: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      copies: {
        include: {
          loans: {
            where: { status: "BORROWED" },
          },
        },
      },
    },
    orderBy: { title: "asc" },
  });

  const totalTitles = books.length;
  const totalCopies = books.reduce((sum, book) => sum + book.copies.length, 0);
  const borrowedCopies = books.reduce(
    (sum, book) =>
      sum + book.copies.filter((copy) => copy.loans.length > 0).length,
    0
  );
  const availableCopies = totalCopies - borrowedCopies;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="overflow-hidden rounded-2xl bg-brand-primary shadow-lg">
        <div className="flex flex-col gap-5 px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white/70">
              <Library size={17} />
              <span className="text-sm font-medium">Library Catalog</span>
            </div>

            <h1 className="mt-2 text-2xl font-bold">
              Books & Resources
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-white/75">
              Manage the school library collection, copies, locations,
              and availability.
            </p>
          </div>

          <Link
            href="?add=1"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-primary shadow-sm transition hover:bg-slate-50"
          >
            <Plus size={17} />
            Add Book
          </Link>
        </div>
      </section>

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Book Titles"
          value={totalTitles}
          icon={Library}
          tone="blue"
        />

        <SummaryCard
          label="Total Copies"
          value={totalCopies}
          icon={BookOpen}
          tone="slate"
        />

        <SummaryCard
          label="Available"
          value={availableCopies}
          icon={CheckCircle2}
          tone="green"
        />

        <SummaryCard
          label="Borrowed"
          value={borrowedCopies}
          icon={BookMarked}
          tone="red"
        />
      </div>

      {/* ADD BOOK */}
      {add === "1" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <BookOpen size={19} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Add a book to the catalog
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Enter the book information and create its physical copies.
                </p>
              </div>
            </div>
          </div>

          <form
            action={async (fd) => {
              "use server";
              await addBook(fd);
            }}
            className="p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field name="title" label="Book title" required />
              <Field name="author" label="Author" />
              <Field name="isbn" label="ISBN" />
              <Field name="category" label="Category" />
              <Field name="shelf" label="Shelf / location" />
              <Field
                name="grade"
                label="Recommended grade"
                type="number"
              />
              <Field
                name="copies"
                label="Initial copies"
                type="number"
                defaultValue="1"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-95"
              >
                <Plus size={17} />
                Add to Library
              </button>

              <Link
                href="/dashboard/employee/librarian/books"
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      )}

      {/* SEARCH */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              name="q"
              defaultValue={q}
              placeholder="Search title, author, ISBN, or category..."
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Search Catalog
          </button>

          {q && (
            <Link
              href="/dashboard/employee/librarian/books"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </form>

        {q && (
          <p className="mt-3 text-xs text-slate-500">
            Showing results for{" "}
            <span className="font-semibold text-slate-700">
              &quot;{q}&quot;
            </span>
          </p>
        )}
      </section>

      {/* CATALOG */}
      {books.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 font-bold text-slate-900">
            {q ? "No books found" : "Your catalog is empty"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {q
              ? "Try another title, author, ISBN, or category."
              : "Add the first book to begin building the school library."}
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Library Collection
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {books.length} title{books.length !== 1 ? "s" : ""}
                </p>
              </div>

              <Library size={20} className="text-slate-300" />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {books.map((book) => {
              const total = book.copies.length;

              const borrowed = book.copies.filter(
                (copy) => copy.loans.length > 0
              ).length;

              const available = total - borrowed;

              const availability =
                total === 0
                  ? "empty"
                  : available === 0
                    ? "unavailable"
                    : available <= 2
                      ? "limited"
                      : "available";

              return (
                <div
                  key={book.id}
                  className="p-5 transition hover:bg-slate-50/70"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* BOOK INFO */}
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                        <BookOpen size={21} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-900">
                          {book.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {book.author ?? "Unknown author"}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                          {book.isbn && (
                            <span>ISBN {book.isbn}</span>
                          )}

                          {book.category && (
                            <span>{book.category}</span>
                          )}

                          {book.grade !== null && (
                            <span>Grade {book.grade}</span>
                          )}
                        </div>

                        {book.shelf && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <MapPin size={13} />
                            Shelf {book.shelf}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AVAILABILITY */}
                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <div className="min-w-[110px]">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-500">
                            Availability
                          </span>

                          {availability === "unavailable" && (
                            <AlertCircle
                              size={14}
                              className="text-red-500"
                            />
                          )}
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-slate-900">
                            {available}
                          </span>
                          <span className="text-xs text-slate-400">
                            / {total}
                          </span>
                        </div>

                        <span
                          className={`text-xs font-semibold ${
                            availability === "available"
                              ? "text-green-600"
                              : availability === "limited"
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {availability === "available"
                            ? "Available"
                            : availability === "limited"
                              ? "Limited copies"
                              : "No copies available"}
                        </span>
                      </div>

                      <AddCopiesForm bookId={book.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number }>;
  tone: "blue" | "slate" | "green" | "red";
}) {
  const styles = {
    blue: "bg-brand-primary/10 text-brand-primary",
    slate: "bg-slate-100 text-slate-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}
        >
          <Icon size={18} />
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}
      </label>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        min={type === "number" ? 1 : undefined}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
      />
    </div>
  );
}

function AddCopiesForm({ bookId }: { bookId: string }) {
  async function handleAdd(formData: FormData) {
    "use server";

    const count = Number(formData.get("count") ?? 1);

    await addCopies(bookId, count);
  }

  return (
    <form action={handleAdd} className="flex items-center gap-2">
      <input
        name="count"
        type="number"
        min={1}
        defaultValue={1}
        aria-label="Number of copies"
        className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center text-xs outline-none focus:border-brand-primary"
      />

      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
      >
        <Plus size={13} />
        Copies
      </button>
    </form>
  );
}
