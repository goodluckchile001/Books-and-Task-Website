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
    <section className="detail-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} /> Back to library
      </Link>
      {loading ? (
        <div className="empty-state">
          <BookOpen size={24} />
          <span>Loading book details...</span>
        </div>
      ) : book ? (
        <article className="book-detail">
          <div className="detail-cover">
            <BookOpen size={64} />
          </div>
          <div className="detail-copy">
            <p className="eyebrow">BOOK DETAILS</p>
            <h2>{book.title}</h2>
            <p className="detail-author">by {book.author}</p>
            <p className="detail-description">
              {book.description || "No description available."}
            </p>
            <div className="detail-meta">
              <span>
                {book.is_already_cached
                  ? "Saved in your library"
                  : "Open Library result"}
              </span>
              {book.source_id && <span>Source: {book.source_id}</span>}
            </div>
            {openLibraryUrl && (
              <a
                className="button button-teal"
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
        <div className="empty-state">
          <BookOpen size={24} />
          <strong>Book details unavailable</strong>
          <span>Return to the library and choose a book again.</span>
        </div>
      )}
      <span className="detail-id">Reference: {bookId}</span>
    </section>
  );
}
