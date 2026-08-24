import { useEffect, useState, type FormEvent } from "react";
import axios, { type AxiosError, type AxiosInstance } from "axios";
import {
  BookOpen,
  CheckCircle2,
  KeyRound,
  LogIn,
  LogOut,
  Plus,
  Search,
} from "lucide-react";

type Book = {
  uuid: string;
  id?: string;
  title: string;
  author: string;
  owner_username?: string | null; // matches BookSerializer.get_owner_username
  description?: string;
  is_already_cached: boolean;
};

type Task = {
  uuid: string;
  title: string;
  completed: boolean;
  is_overdue?: boolean;
  category?: { name: string } | null;
};

type Category = {
  id: number;
  name: string;
  color: string;
  task_count: number;
};

type LoginResponse = {
  access: string;
  refresh: string;
};

// DRF's paginated list responses look like { count, next, previous, results }.
// Custom @action endpoints that return Response(list) directly (e.g.
// /books/search/) do NOT get wrapped this way. This helper normalizes both
// shapes so callers don't have to know which one they're getting.
function unwrapResults<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const DEFAULT_BOOK_QUERY = "fiction";

const API: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attaches the JWT access token to every request.
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401, try exactly once to refresh the access token via
// /login/refresh/ and replay the original request. ACCESS_TOKEN_LIFETIME
// is 15 minutes (see settings.py), so without this, any session older
// than 15 min starts failing every authenticated request silently.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(`${API_BASE_URL}/login/refresh/`, {
      refresh: refreshToken,
    });
    localStorage.setItem("accessToken", data.access);
    // ROTATE_REFRESH_TOKENS is on in settings.py, so a rotated refresh
    // token may come back too — persist it if present.
    if (data.refresh) {
      localStorage.setItem("refreshToken", data.refresh);
    }
    return data.access as string;
  } catch {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    return null;
  }
}

API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Coalesce concurrent 401s into a single refresh call rather than
      // firing one refresh request per failed request.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      if (newAccessToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") return JSON.stringify(data);
    return error.message;
  }
  return "Something went wrong.";
}

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("accessToken")),
  );

  const [taskTitle, setTaskTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [searchQuery, setSearchQuery] = useState(DEFAULT_BOOK_QUERY);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    try {
      const response = await axios.post<LoginResponse>(
        `${API_BASE_URL}/login/`,
        { username, password },
      );
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      setIsLoggedIn(true);
      setPassword("");
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksResponse, categoriesResponse] = await Promise.all([
          API.get("/books/search/", { params: { q: DEFAULT_BOOK_QUERY } }),
          API.get("/categories/"),
        ]);
        setBooks(unwrapResults<Book>(booksResponse.data));
        setCategories(unwrapResults<Category>(categoriesResponse.data));

        if (isLoggedIn) {
          const tasksResponse = await API.get("/tasks/");
          setTasks(unwrapResults<Task>(tasksResponse.data));
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error("Error receiving data from backend:", error);
        setFormError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isLoggedIn]);

  const handleCreateTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : null;

    try {
      const payload = {
        title: taskTitle,
        category_id: Number.isNaN(parsedCategoryId) ? null : parsedCategoryId,
        assigned_to_ids: [],
      };

      const response = await API.post("/tasks/", payload);
      setTasks((prevTasks) => [...prevTasks, response.data]);
      setTaskTitle("");
      setCategoryId("");
    } catch (error) {
      console.error("Error sending task:", error);
      setFormError(getErrorMessage(error));
    }
  };

  const handleSearchBooks = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setFormError(null);

    try {
      // search_books is a custom @action returning Response(list) directly
      // — not paginated like the standard /books/ list — so no unwrapResults
      // needed here, but it's harmless to apply anyway for consistency.
      const response = await API.get("/books/search/", {
        params: { q: searchQuery },
      });
      setBooks(unwrapResults<Book>(response.data));
    } catch (error) {
      console.error("Search failed:", error);
      setFormError(getErrorMessage(error));
    }
  };

  if (loading)
    return (
      <main className="loading-screen">
        <BookOpen size={24} />
        <p>Loading your reading desk...</p>
      </main>
    );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="eyebrow">PERSONAL LIBRARY</p>
            <h1>Reading desk</h1>
          </div>
        </div>
        <span className="topbar-note">A calmer way to keep track</span>
      </header>

      <section className="auth-portal">
        <div className="auth-copy">
          <p className="eyebrow">ACCOUNT PORTAL</p>
          <h3>
            {isLoggedIn ? "Your desk is unlocked" : "Sign in to your desk"}
          </h3>
          <p>
            {isLoggedIn
              ? "Your personal tasks are ready."
              : "Log in to manage tasks and save your reading."}
          </p>
        </div>
        {isLoggedIn ? (
          <button
            className="button button-ghost"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Log out
          </button>
        ) : (
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="button button-dark" type="submit">
              <LogIn size={16} /> Log in
            </button>
          </form>
        )}
      </section>

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

      {formError && (
        <div className="alert" role="alert">
          {formError}
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

      <div className="content-grid">
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
                  <div className="book-cover">
                    <BookOpen size={22} />
                  </div>
                  <div className="book-info">
                    <strong>{book.title}</strong>
                    <span>by {book.author}</span>
                    <p>{book.description || "No description available."}</p>
                    <small>{book.owner_username || "System catalog"}</small>
                  </div>
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

        <section className="content-panel">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">PERSONAL QUEUE</p>
              <h3>Your tasks</h3>
            </div>
            <KeyRound size={20} />
          </div>
          <div className="task-create">
            <div className="section-heading">
              <div className="section-icon section-icon-coral">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="eyebrow">TODAY'S LIST</p>
                <h3>Keep your reading moving</h3>
              </div>
            </div>
            <form onSubmit={handleCreateTask} className="task-form">
              <input
                type="text"
                placeholder="Add a task or reading goal"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
              />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button className="button button-coral" type="submit">
                <Plus size={17} /> Add task
              </button>
            </form>
          </div>
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.uuid} className="task-item">
                <span
                  className={`task-dot ${task.completed ? "is-complete" : ""}`}
                />
                <div>
                  <strong>{task.title}</strong>
                  <small>{task.category?.name || "Uncategorized"}</small>
                </div>
                {task.is_overdue && <span className="overdue">Overdue</span>}
                <span className="task-state">
                  {task.completed ? "Done" : "Open"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

export default App;
