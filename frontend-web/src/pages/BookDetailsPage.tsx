import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Library } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { API, type Book, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";

export default function BookDetailsPage() {
  const { bookId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const routedBook = (location.state as { book?: Book } | null)?.book;
  const [book, setBook] = useState<Book | undefined>(routedBook);
  const [loading, setLoading] = useState(!routedBook);
  const [notFound, setNotFound] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (routedBook || !bookId) return;
    const id = decodeURIComponent(bookId);

    const loadBook = async () => {
      try {
        if (id.startsWith("/works/")) {
          // Proxied through our own backend, cached server-side — the
          // reader never leaves this site to get the description.
          const response = await API.get<Book>("/books/lookup/", {
            params: { source_id: id },
          });
          setBook(response.data);
        } else {
          const response = await API.get<Book>(`/books/${id}/`);
          setBook(response.data);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadBook();
  }, [bookId, routedBook]);

  const handleImport = async () => {
    if (!book) return;
    setImportError(null);
    setImporting(true);
    try {
      const response = await API.post<Book>("/books/import/", {
        source_id: book.source_id,
        source_type: book.source_type ?? "openlibrary",
        title: book.title,
        author: book.author,
        description: book.description,
      });
      // Now a real local book — swap to its own uuid-based URL so
      // refresh/share links point at the saved copy, not the source key.
      navigate(`/books/${response.data.uuid}`, {
        replace: true,
        state: { book: response.data },
      });
    } catch (err) {
      setImportError(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="pt-12">
      <Link
        className="mb-6 inline-flex items-center gap-1 font-['Spectral',Georgia,serif] text-xs font-semibold text-[#0f3d2e] no-underline"
        to="/"
      >
        <ArrowLeft size={16} /> Back to library
      </Link>

      {loading ? (
        <div className="grid place-items-center gap-2 px-3 py-10 text-center text-[#0f3d2e]">
          <BookOpen size={24} />
          <span className="text-xs text-[#1c1b17]/60">
            Loading book details…
          </span>
        </div>
      ) : book ? (
        <article className="grid max-w-4xl gap-8 border border-[#1c1b17]/15 bg-[#f3ecd9] p-6 md:grid-cols-[0.8fr_1.2fr] md:p-10">
          <div className="grid aspect-3/4 place-items-center overflow-hidden border border-[#1c1b17]/15 bg-[#e5dcc4] text-[#0f3d2e]">
            {book.cover_url ? (
              <img
                className="w-full h-full object-contain"
                src={book.cover_url}
                alt={`Cover of ${book.title}`}
              />
            ) : (
              <BookOpen size={64} />
            )}
          </div>
          <div>
            <p className="font-['Spectral',Georgia,serif] text-[13px] italic text-[#7b2d26]">
              Book details
            </p>
            <h2 className="mt-2 mb-2 font-['Spectral',Georgia,serif] text-4xl font-medium leading-tight text-[#1c1b17]">
              {book.title}
            </h2>
            <p className="text-base italic text-[#1c1b17]/60">
              by {book.author}
            </p>
            <p className="my-7 max-w-md leading-relaxed text-sm text-[#1c1b17]/75">
              {book.description || "No description available."}
            </p>

            {book.subjects && book.subjects.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2 text-xs text-[#1c1b17]/60">
                {book.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="border border-[#1c1b17]/20 px-2 py-1.5"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            )}

            {importError && (
              <div
                className="mb-4 px-4 py-3 text-[#9f392d] bg-[#ffebe5] border border-[#c95543] text-xs"
                role="alert"
              >
                {importError}
              </div>
            )}

            {book.is_already_cached ? (
              <span className="inline-flex h-11 items-center gap-1 border border-[#0f3d2e] px-4 text-xs font-semibold text-[#0f3d2e]">
                Saved in your library
              </span>
            ) : isLoggedIn ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-1 bg-[#0f3d2e] px-4 text-xs font-semibold text-[#faf6ec] transition-colors hover:bg-[#18533f] disabled:opacity-60"
                onClick={handleImport}
                disabled={importing}
                type="button"
              >
                <Library size={16} />{" "}
                {importing ? "Adding…" : "Add to my library"}
              </button>
            ) : (
              <Link
                className="inline-flex h-11 items-center justify-center gap-1 bg-[#0f3d2e] px-4 text-xs font-semibold text-[#faf6ec] no-underline transition-colors hover:bg-[#18533f]"
                to="/login"
              >
                Log in to save this book
              </Link>
            )}
          </div>
        </article>
      ) : (
        <div className="grid place-items-center gap-2 px-3 py-10 text-center text-[#0f3d2e]">
          <BookOpen size={24} />
          <strong className="font-['Spectral',Georgia,serif] text-sm text-[#1c1b17]">
            {notFound ? "Book details unavailable" : "Something went wrong"}
          </strong>
          <span className="text-xs text-[#1c1b17]/60">
            Return to the library and choose a book again.
          </span>
        </div>
      )}
    </section>
  );
}
