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
      <section className="intro-row">
        <div>
          <p className="eyebrow">YOUR COLLECTION</p>
          <h2>Make room for a good story.</h2>
          <p className="intro-copy">
            Search the local shelf and Open Library in one place.
          </p>
        </div>
        <div className="stat-chip">
          <span>{books.length}</span> books found
        </div>
      </section>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <section className="search-panel">
        <div className="section-heading">
          <div className="section-icon">
            <Search size={18} />
          </div>
          <div>
            <p className="eyebrow">DISCOVER</p>
            <h3>Find your next read</h3>
          </div>
        </div>
        <form onSubmit={handleSearchBooks} className="search-form">
          <input
            type="text"
            placeholder="Title, author, or keyword"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="button button-teal" type="submit">
            <Search size={16} /> Search catalog
          </button>
        </form>
      </section>

      <section className="content-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">CATALOG</p>
            <h3>Books on the shelf</h3>
          </div>
          <BookOpen size={20} />
        </div>
        <ul className="book-list">
          {books.length === 0 ? (
            <li className="empty-state">
              <BookOpen size={22} />
              <strong>No books on the shelf yet</strong>
              <span>Search above to discover books from Open Library.</span>
            </li>
          ) : (
            books.map((book, index) => (
              <li
                key={book.uuid || book.id || `book-${index}`}
                className="book-item"
              >
                <Link
                  className="book-link"
                  to={`/books/${encodeURIComponent(book.id || book.source_id || book.uuid)}`}
                  state={{ book }}
                >
                  <div className="book-cover">
                    <BookOpen size={22} />
                  </div>
                  <div className="book-info">
                    <strong>{book.title}</strong>
                    <span>by {book.author}</span>
                    <p>{book.description || "No description available."}</p>
                    <small>{book.owner_username || "System catalog"}</small>
                  </div>
                </Link>
                <span
                  className={`status-pill ${book.is_already_cached ? "is-saved" : "is-available"}`}
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
