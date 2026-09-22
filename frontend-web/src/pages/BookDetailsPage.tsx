import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { API, type Book } from "../api/client";

export default function BookDetailsPage() {
  const { bookId } = useParams();
  const location = useLocation();
  const routedBook = (location.state as { book?: Book } | null)?.book;
  const [book, setBook] = useState<Book | undefined>(routedBook);
  const [loading, setLoading] = useState(!routedBook);

  useEffect(() => {
    if (routedBook || !bookId) return;
    const id = decodeURIComponent(bookId);
    const loadBook = async () => {
      try {
        if (id.startsWith("/works/")) {
          const response = await axios.get(`https://openlibrary.org${id}.json`);
          setBook({
            uuid: id,
            title: response.data.title || "Untitled book",
            author: "Open Library author",
            description:
              typeof response.data.description === "string"
                ? response.data.description
                : "Available from Open Library.",
            cover_url: response.data.covers?.[0]
              ? `https://covers.openlibrary.org/b/id/${response.data.covers[0]}-L.jpg`
              : null,
            is_already_cached: false,
            source_id: id,
            source_type: "openlibrary",
          });
        } else {
          const response = await API.get<Book>(`/books/${id}/`);
          setBook(response.data);
        }
      } catch {
        setBook(undefined);
      } finally {
        setLoading(false);
      }
    };
    loadBook();
  }, [bookId, routedBook]);
  const openLibraryUrl = book?.source_id?.startsWith("/")
    ? `https://openlibrary.org${book.source_id}`
    : null;

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
            Loading book details...
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
            <div className="mb-6 flex flex-wrap gap-2 text-xs text-[#1c1b17]/60">
              <span className="border border-[#1c1b17]/20 px-2 py-1.5">
                {book.is_already_cached
                  ? "Saved in your library"
                  : "Open Library result"}
              </span>
              {book.source_id && (
                <span className="border border-[#1c1b17]/20 px-2 py-1.5">
                  Source: {book.source_id}
                </span>
              )}
            </div>
            {openLibraryUrl && (
              <a
                className="inline-flex h-11 items-center justify-center gap-1 bg-[#0f3d2e] px-4 text-xs font-semibold text-[#faf6ec] transition-colors hover:bg-[#18533f]"
                href={openLibraryUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} /> View on Open Library
              </a>
            )}
          </div>
        </article>
      ) : (
        <div className="grid place-items-center gap-2 px-3 py-10 text-center text-[#0f3d2e]">
          <BookOpen size={24} />
          <strong className="font-['Spectral',Georgia,serif] text-sm text-[#1c1b17]">
            Book details unavailable
          </strong>
          <span className="text-xs text-[#1c1b17]/60">
            Return to the library and choose a book again.
          </span>
        </div>
      )}
      <span className="mt-3 block text-[11px] text-[#1c1b17]/40">
        Reference: {bookId}
      </span>
    </section>
  );
}
