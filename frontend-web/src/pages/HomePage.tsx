import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { API, type Book, unwrapResults, getErrorMessage } from "../api/client";

const DEFAULT_BOOK_QUERY = "fiction";

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
      <div className="loading-screen">
        <BookOpen size={24} />
        <p>Loading your reading desk...</p>
      </div>
    );

  return (
    <>
      <section className="flex items-end justify-between gap-6 py-14 px-0">
        <div>
          <p className="text-xs font-black tracking-wider text-teal-700">
            YOUR COLLECTION
          </p>
          <h2>Make room for a good story.</h2>
          <p className="m-0 text-gray-600 text-base">
            Search the local shelf and Open Library in one place.
          </p>
        </div>
        <div className="px-3 py-2.5 text-gray-600 border border-gray-400 rounded-full text-xs whitespace-nowrap">
          <span className="mr-1 text-red-600 text-lg font-black">
            {books.length}
          </span>{" "}
          books found
        </div>
      </section>

      {error && (
        <div
          className="mb-5 p-3 text-red-900 bg-red-100 border border-red-300 rounded text-xs"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="border border-gray-300 rounded-xl bg-white shadow-lg p-4.5 flex items-center justify-between gap-5.5">
        <div className="flex items-center gap-2.5">
          <div
            className="grid place-items-center w-9 h-9 text-white rounded-lg"
            style={{ background: "var(--teal)" }}
          >
            <Search size={18} />
          </div>
          <div>
            <p className="text-xs font-black tracking-wider text-teal-700">
              DISCOVER
            </p>
            <h3>Find your next read</h3>
          </div>
        </div>
        <form
          onSubmit={handleSearchBooks}
          className="flex items-center gap-2 flex-1 max-w-2xl"
        >
          <input
            type="text"
            placeholder="Title, author, or keyword"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 border border-gray-300 rounded px-3 text-gray-900 bg-white bg-opacity-75 flex-1 min-w-0"
          />
          <button
            className="inline-flex items-center justify-center gap-1 h-10 px-3 rounded text-xs font-bold text-white bg-teal-700 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            type="submit"
          >
            <Search size={16} /> Search catalog
          </button>
        </form>
      </section>

      <section className="border border-gray-300 rounded-xl bg-white shadow-lg p-5 mt-3">
        <div className="flex items-start justify-between border-b border-gray-300 pb-4 mb-4">
          <div>
            <p className="text-xs font-black tracking-wider text-teal-700">
              CATALOG
            </p>
            <h3>Books on the shelf</h3>
          </div>
          <BookOpen size={20} className="text-teal-700" />
        </div>
        <ul className="list-none p-0 m-0">
          {books.length === 0 ? (
            <li className="grid place-items-center gap-2 py-10 px-3 text-teal-700 text-center">
              <BookOpen size={22} />
              <strong className="text-gray-900 text-sm">
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
                className="relative flex items-start gap-3 py-4 px-0 border-b border-gray-300 last:border-b-0"
              >
                <Link
                  className="flex items-start flex-1 gap-3 min-w-0 text-inherit no-underline hover:text-inherit"
                  to={`/books/${encodeURIComponent(book.id || book.source_id || book.uuid)}`}
                  state={{ book }}
                >
                  <div className="grid place-items-center flex-shrink-0 w-10 h-14 text-teal-700 bg-emerald-100 rounded-bl-lg rounded-tr-lg">
                    <BookOpen size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block overflow-hidden text-gray-900 text-ellipsis whitespace-nowrap text-sm">
                      {book.title}
                    </strong>
                    <span className="block mt-0.5 text-gray-600 text-xs">
                      by {book.author}
                    </span>
                    <p className="block my-2 text-gray-700 text-xs leading-relaxed">
                      {book.description || "No description available."}
                    </p>
                    <small className="block text-gray-500 text-xs">
                      {book.owner_username || "System catalog"}
                    </small>
                  </div>
                </Link>
                <span
                  className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-black ${
                    book.is_already_cached
                      ? "text-green-800 bg-green-100"
                      : "text-yellow-900 bg-yellow-100"
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
