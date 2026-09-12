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
        className="inline-flex items-center gap-1 mb-6 text-teal-700 text-xs font-black no-underline"
        to="/"
      >
        <ArrowLeft size={16} /> Back to library
      </Link>
      {loading ? (
        <div className="grid place-items-center gap-2 py-10 px-3 text-teal-700 text-center">
          <BookOpen size={24} />
          <span className="text-gray-600 text-xs">Loading book details...</span>
        </div>
      ) : book ? (
        <article className="grid grid-cols-2 gap-8 max-w-3xl p-8 border border-gray-300 rounded-xl bg-white shadow-lg">
          <div
            className="grid place-items-center aspect-video text-teal-700 rounded-lg"
            style={{ background: "#dbe8df" }}
          >
            <BookOpen size={64} />
          </div>
          <div>
            <p className="text-xs font-black tracking-wider text-teal-700">
              BOOK DETAILS
            </p>
            <h2 className="mt-2 mb-2 text-3xl">{book.title}</h2>
            <p className="text-gray-600 text-base">by {book.author}</p>
            <p className="max-w-md my-7 text-gray-700 leading-relaxed">
              {book.description || "No description available."}
            </p>
            <div className="flex flex-wrap gap-2 mb-6 text-gray-600 text-xs">
              <span className="px-2 py-1.5 rounded bg-gray-100">
                {book.is_already_cached
                  ? "Saved in your library"
                  : "Open Library result"}
              </span>
              {book.source_id && (
                <span className="px-2 py-1.5 rounded bg-gray-100">
                  Source: {book.source_id}
                </span>
              )}
            </div>
            {openLibraryUrl && (
              <a
                className="inline-flex items-center justify-center gap-1 h-10 px-3 rounded text-xs font-bold text-white"
                style={{ background: "var(--teal)" }}
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
        <div className="grid place-items-center gap-2 py-10 px-3 text-teal-700 text-center">
          <BookOpen size={24} />
          <strong className="text-gray-900 text-sm">
            Book details unavailable
          </strong>
          <span className="text-gray-600 text-xs">
            Return to the library and choose a book again.
          </span>
        </div>
      )}
      <span className="block mt-3 text-gray-400 text-xs">
        Reference: {bookId}
      </span>
    </section>
  );
}
