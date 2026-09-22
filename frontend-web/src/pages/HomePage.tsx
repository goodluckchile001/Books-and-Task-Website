import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { API, type Book, unwrapResults, getErrorMessage } from "../api/client";

const DEFAULT_BOOK_QUERY = "fiction";

const FontImport = () => (
  <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Spectral:ital,wght@0,400;0,500;0,600;1,400&display=swap');`}</style>
);

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(DEFAULT_BOOK_QUERY);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await API.get("/books/search/", {
          params: { q: DEFAULT_BOOK_QUERY },
        });
        setBooks(unwrapResults<Book>(response.data));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const quickMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return books.slice(0, 5);
    return books
      .filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [books, searchQuery]);

  const handleSearchBooks = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    setError(null);
    setSearchOpen(false);

    try {
      const response = await API.get("/books/search/", {
        params: { q: searchQuery },
      });
      setBooks(unwrapResults<Book>(response.data));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#176b57]">
        <FontImport />
        <BookOpen size={24} />
        <p className="text-sm text-[#173b35]/70">
          Loading your reading desk...
        </p>
      </div>
    );
  }

  return (
    <>
      <FontImport />
      <section className="grid gap-8 border-b border-[#173b35]/15 py-14 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="mb-2 font-['Spectral',Georgia,serif] text-sm italic text-[#2d8068]">
            Your collection
          </p>
          <h2 className="m-0 max-w-3xl font-['Spectral',Georgia,serif] text-4xl font-medium leading-[1.08] text-[#173b35] md:text-6xl">
            Make room for a good story.
          </h2>
          <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#173b35]/65">
            Search your shelf and Open Library in one place.
          </p>
        </div>
        <div className="flex items-center gap-3 border border-[#b8d8c9] bg-white px-4 py-3 shadow-[4px_4px_0_#b8d8c9]">
          <Sparkles size={18} className="text-[#2d8068]" />
          <div>
            <strong className="block font-['Spectral',Georgia,serif] text-2xl font-medium text-[#173b35]">
              {books.length}
            </strong>
            <span className="block text-xs text-[#60756e]">
              titles on the shelf
            </span>
          </div>
        </div>
      </section>

      {error && (
        <div
          className="mt-6 border border-[#e76f51] bg-[#fff0ee] px-4 py-3 text-xs text-[#b93832]"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="relative z-10 mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 font-['Spectral',Georgia,serif] text-sm italic text-[#2d8068]">
              Discover
            </p>
            <h3 className="m-0 font-['Spectral',Georgia,serif] text-2xl font-semibold text-[#173b35]">
              Find your next read
            </h3>
          </div>
          <span className="hidden text-xs text-[#60756e] sm:block">
            Search by title or author
          </span>
        </div>
        <form onSubmit={handleSearchBooks} className="relative">
          <Search
            size={19}
            aria-hidden="true"
            className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-[#2d8068]"
          />
          <input
            type="text"
            placeholder="Title, author, or keyword"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(true);
            }}
            aria-label="Search books"
            className="h-14 w-full rounded-xl border border-[#b8d8c9] bg-white pl-14 pr-32 text-sm text-[#173b35] shadow-[0_10px_24px_rgba(23,59,53,0.08)] outline-none transition-shadow placeholder:text-[#60756e]/70 focus:border-[#176b57] focus:shadow-[0_12px_30px_rgba(23,107,87,0.16)]"
          />
          <button
            className="absolute right-2 top-2 inline-flex h-10 items-center gap-2 rounded-lg bg-[#176b57] px-4 text-sm font-semibold text-white transition hover:bg-[#125342]"
            type="submit"
          >
            Search
          </button>
          {searchOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] overflow-hidden rounded-xl border border-[#cfddd7] bg-white p-2 shadow-[0_18px_40px_rgba(23,59,53,0.16)]">
              <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#60756e]">
                Quick matches
              </p>
              {quickMatches.length ? (
                quickMatches.map((book, index) => (
                  <Link
                    key={book.uuid || book.id || `match-${index}`}
                    to={`/books/${encodeURIComponent(book.id || book.source_id || book.uuid)}`}
                    state={{ book }}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-inherit no-underline transition hover:bg-[#e7f3ed]"
                  >
                    <div className="grid h-10 w-8 shrink-0 place-items-center overflow-hidden rounded border border-[#cfddd7] bg-[#eef5f1] text-[#176b57]">
                      {book.cover_url ? (
                        <img
                          className="h-full w-full object-cover"
                          src={book.cover_url}
                          alt=""
                        />
                      ) : (
                        <BookOpen size={15} />
                      )}
                    </div>
                    <span className="min-w-0 truncate text-sm font-medium text-[#173b35]">
                      {book.title}
                    </span>
                    <span className="ml-auto hidden text-xs text-[#60756e] sm:block">
                      {book.author}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-3 py-4 text-sm text-[#60756e]">
                  Press Search to browse this phrase.
                </p>
              )}
            </div>
          )}
        </form>
      </section>

      <section className="mt-16 pb-10">
        <div className="mb-6 flex items-end justify-between border-b border-[#173b35]/15 pb-4">
          <div>
            <p className="mb-1 font-['Spectral',Georgia,serif] text-sm italic text-[#2d8068]">
              Catalog
            </p>
            <h3 className="m-0 font-['Spectral',Georgia,serif] text-2xl font-semibold text-[#173b35]">
              Books on the shelf
            </h3>
          </div>
          <BookOpen size={21} className="text-[#176b57]" />
        </div>
        {books.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-[#b8d8c9] bg-white py-16 text-center text-[#60756e]">
            <BookOpen size={26} className="text-[#176b57]" />
            <strong className="font-['Spectral',Georgia,serif] text-[#173b35]">
              No books on the shelf yet
            </strong>
            <span className="text-sm">
              Search above to discover books from Open Library.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book, index) => (
              <Link
                key={book.uuid || book.id || `book-${index}`}
                to={`/books/${encodeURIComponent(book.id || book.source_id || book.uuid)}`}
                state={{ book }}
                className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#cfddd7] bg-white p-3 text-inherit no-underline shadow-[0_8px_18px_rgba(23,59,53,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(23,59,53,0.14)]"
              >
                <div className="relative mb-4 flex aspect-3/4 items-center justify-center overflow-hidden rounded-lg bg-[#e7f3ed] text-[#176b57]">
                  {book.cover_url ? (
                    <img
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      src={book.cover_url}
                      alt={`Cover of ${book.title}`}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <BookOpen size={42} />
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#176b57] shadow-sm">
                    {book.is_already_cached ? "Saved" : "Available"}
                  </span>
                </div>
                <strong className="line-clamp-2 min-h-10 font-['Spectral',Georgia,serif] text-base font-semibold leading-tight text-[#173b35]">
                  {book.title}
                </strong>
                <span className="mt-1 line-clamp-1 text-xs text-[#60756e]">
                  {book.author}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
