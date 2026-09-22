import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { API, type Book, unwrapResults, getErrorMessage } from "../api/client";

const DEFAULT_BOOK_QUERY = "fiction";

const FontImport = () => (
  <style>{`@import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&display=swap');`}</style>
);

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(DEFAULT_BOOK_QUERY);

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

  const handleSearchBooks = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setError(null);

    try {
      const response = await API.get("/books/search/", {
        params: { q: searchQuery },
      });
      setBooks(unwrapResults<Book>(response.data));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#0f3d2e]">
        <FontImport />
        <BookOpen size={24} />
        <p className="text-sm text-[#1c1b17]/70">
          Loading your reading desk...
        </p>
      </div>
    );

  return (
    <>
      <FontImport />

      <section className="flex flex-wrap items-end justify-between gap-6 py-12 border-b border-[#20352f]/20">
        <div>
          <p className="font-['Spectral',Georgia,serif] italic text-[13px] text-[#c95543] mb-1">
            Your collection
          </p>
          <h2 className="font-['Spectral',Georgia,serif] font-medium text-4xl leading-[1.15] text-[#20352f] m-0 mb-2">
            Make room for a good story.
          </h2>
          <p className="m-0 text-[#1c1b17]/60 text-sm max-w-[34ch]">
            Search your shelf and Open Library in one place.
          </p>
        </div>
        <div className="flex flex-col items-center gap-0.5 min-w-27 -rotate-1 border border-[#d39a3c] bg-[#fff0c7] px-4.5 py-3 shadow-[4px_4px_0_#d39a3c]">
          <span className="font-['Spectral',Georgia,serif] text-2xl text-[#1c1b17]">
            {books.length}
          </span>
          <span className="font-['Spectral',Georgia,serif] italic text-[11px] text-[#1c1b17]/60 text-center">
            titles on the shelf
          </span>
        </div>
      </section>

      {error && (
        <div
          className="mt-5 px-4 py-3 text-[#9f392d] bg-[#ffebe5] border border-[#c95543] text-xs"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="mt-6 flex flex-wrap items-center justify-between gap-6 border border-[#20352f]/20 border-l-4 border-l-[#07533f] bg-[#fff0c7] px-6 py-5 shadow-[5px_5px_0_#b8d5c2]">
        <div>
          <p className="font-['Spectral',Georgia,serif] italic text-[13px] text-[#b47724] mb-1">
            Discover
          </p>
          <h3 className="font-['Spectral',Georgia,serif] font-semibold text-lg text-[#1c1b17] m-0">
            Find your next read
          </h3>
        </div>
        <form
          onSubmit={handleSearchBooks}
          className="flex flex-1 min-w-65 items-center gap-3"
        >
          <input
            type="text"
            placeholder="Title, author, or keyword"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search books"
            className="min-w-0 flex-1 border-0 border-b border-[#1c1b17]/25 bg-transparent px-0.5 py-2 text-sm text-[#1c1b17] placeholder:text-[#1c1b17]/40 focus:border-[#0f3d2e] focus:outline-none"
          />
          <button
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#07533f] px-4.5 py-2.5 text-sm font-semibold text-[#fffaf0] transition-all hover:-translate-y-0.5 hover:bg-[#0d7055] hover:shadow-[0_4px_10px_rgba(7,83,63,0.3)]"
            type="submit"
          >
            <Search size={16} /> Search catalog
          </button>
        </form>
      </section>

      <section className="mt-7">
        <div className="mb-1 flex items-end justify-between border-b border-[#20352f]/20 pb-3">
          <div>
            <p className="font-['Spectral',Georgia,serif] italic text-[13px] text-[#b47724] mb-1">
              Catalog
            </p>
            <h3 className="font-['Spectral',Georgia,serif] font-semibold text-lg text-[#1c1b17] m-0">
              Books on the shelf
            </h3>
          </div>
          <BookOpen size={20} className="text-[#0f3d2e]" />
        </div>
        <ul className="m-0 list-none p-0">
          {books.length === 0 ? (
            <li className="flex flex-col items-center gap-2 py-12 px-3 text-center text-[#1c1b17]/60">
              <BookOpen size={24} className="text-[#0f3d2e]" />
              <strong className="font-['Spectral',Georgia,serif] text-sm text-[#1c1b17]">
                No books on the shelf yet
              </strong>
              <span className="text-gray-600 text-xs">
                Search above to discover books from Open Library.
              </span>
            </li>
          ) : (
            books.map((book, index) => (
              <li
                key={book.uuid || book.id || `book-${index}`}
                className="relative flex items-start gap-4 border-b border-[#1c1b17]/15 py-4.5 last:border-b-0"
              >
                <Link
                  className="flex min-w-0 flex-1 items-start gap-4 text-inherit no-underline"
                  to={`/books/${encodeURIComponent(book.id || book.source_id || book.uuid)}`}
                  state={{ book }}
                >
                  <div className="grid h-15 w-11 shrink-0 place-items-center overflow-hidden rounded-tr-lg rounded-bl-lg border border-[#1c1b17]/15 bg-[#f3ecd9] text-[#0f3d2e]">
                    {book.cover_url ? (
                      <img
                        className="w-full h-full object-cover"
                        src={book.cover_url}
                        alt={`Cover of ${book.title}`}
                      />
                    ) : (
                      <BookOpen size={22} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block overflow-hidden text-ellipsis whitespace-nowrap font-['Spectral',Georgia,serif] text-sm font-semibold text-[#1c1b17]">
                      {book.title}
                    </strong>
                    <span className="mt-0.5 block text-xs italic text-[#1c1b17]/60">
                      by {book.author}
                    </span>
                    <p className="my-2 line-clamp-2 text-xs leading-relaxed text-[#1c1b17]/75">
                      {book.description || "No description available."}
                    </p>
                    <small className="block text-[11px] text-[#a9824f]">
                      {book.owner_username || "System catalog"}
                    </small>
                  </div>
                </Link>
                <span
                  className={`mt-0.5 shrink-0 -rotate-2 self-start border px-2.5 py-1 font-['Spectral',Georgia,serif] italic text-[11px] ${
                    book.is_already_cached
                      ? "border-[#0f3d2e] text-[#0f3d2e]"
                      : "border-[#7b2d26] text-[#7b2d26]"
                  }`}
                >
                  {book.is_already_cached ? "Saved" : "Available"}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );
}
