import { useEffect, useState, type FormEvent } from "react";
import axios, { type AxiosError, type AxiosInstance } from "axios";

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
  const [searchQuery, setSearchQuery] = useState("");

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
        const [booksResponse, tasksResponse, categoriesResponse] =
          await Promise.all([
            API.get("/books/"),
            API.get("/tasks/"),
            API.get("/categories/"),
          ]);
        setBooks(unwrapResults<Book>(booksResponse.data));
        setTasks(unwrapResults<Task>(tasksResponse.data));
        setCategories(unwrapResults<Category>(categoriesResponse.data));
      } catch (error) {
        console.error("Error receiving data from backend:", error);
        setFormError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
    return <p style={{ padding: "30px" }}>Loading full-stack system data...</p>;

  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "sans-serif",
        backgroundColor: "#f9f9f9",
        minHeight: "100vh",
      }}
    >
      <h1>Django DRF API Dashboard</h1>

      <section
        style={{
          marginBottom: "30px",
          padding: "15px",
          border: "1px solid #ddd",
          backgroundColor: "#fff",
          borderRadius: "8px",
        }}
      >
        {isLoggedIn ? (
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        ) : (
          <form onSubmit={handleLogin} style={{ display: "flex", gap: "10px" }}>
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
            <button type="submit">Log in</button>
          </form>
        )}
      </section>

      {formError && (
        <div
          style={{
            marginBottom: "20px",
            padding: "10px 15px",
            backgroundColor: "#fdecea",
            border: "1px solid #f5c2c0",
            borderRadius: "6px",
            color: "#611a15",
          }}
        >
          {formError}
        </div>
      )}

      <section
        style={{
          marginBottom: "30px",
          padding: "15px",
          border: "1px solid #ddd",
          backgroundColor: "#fff",
          borderRadius: "8px",
        }}
      >
        <h3>Unified Library Search Engine (GET)</h3>
        <form
          onSubmit={handleSearchBooks}
          style={{ display: "flex", gap: "10px" }}
        >
          <input
            type="text"
            placeholder="Search local catalog & OpenLibrary simultaneously..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: "8px" }}
          />
          <button
            type="submit"
            style={{ padding: "8px 15px", cursor: "pointer" }}
          >
            Search
          </button>
        </form>
      </section>

      <section
        style={{
          marginBottom: "30px",
          padding: "15px",
          border: "1px solid #ddd",
          backgroundColor: "#fff",
          borderRadius: "8px",
        }}
      >
        <h3>Create New Task (POST)</h3>
        <form
          onSubmit={handleCreateTask}
          style={{ display: "flex", gap: "10px" }}
        >
          <input
            type="text"
            placeholder="Task Title"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
            style={{ padding: "8px" }}
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ padding: "8px" }}
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{ padding: "8px 15px", cursor: "pointer" }}
          >
            Add Task
          </button>
        </form>
      </section>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        <section
          style={{
            padding: "15px",
            border: "1px solid #ddd",
            backgroundColor: "#fff",
            borderRadius: "8px",
          }}
        >
          <h3>Books List Results</h3>
          <ul style={{ paddingLeft: "20px" }}>
            {books.map((book, index) => (
              <li
                key={book.uuid || book.id || `book-${index}`}
                style={{
                  marginBottom: "15px",
                  paddingBottom: "10px",
                  borderBottom: "1px dashed #eee",
                }}
              >
                <strong>{book.title}</strong> by {book.author} <br />
                <small style={{ color: "#666" }}>
                  Posted by: {book.owner_username || "System Core / Anonymous"}
                </small>{" "}
                <br />
                <p style={{ margin: "5px 0", color: "#444" }}>
                  {book.description}
                </p>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    backgroundColor: book.is_already_cached
                      ? "#e2f0d9"
                      : "#fff2cc",
                  }}
                >
                  {book.is_already_cached
                    ? "📁 Saved in Library"
                    : "🌐 Available to Import"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          style={{
            padding: "15px",
            border: "1px solid #ddd",
            backgroundColor: "#fff",
            borderRadius: "8px",
          }}
        >
          <h3>Tasks List (Scoped User View)</h3>
          <ul style={{ paddingLeft: "0", listStyle: "none" }}>
            {tasks.map((task) => (
              <li
                key={task.uuid}
                style={{
                  marginBottom: "12px",
                  padding: "10px",
                  border: "1px solid #eee",
                  borderRadius: "4px",
                }}
              >
                <strong>{task.title}</strong> -{" "}
                {task.completed ? "✅ Done" : "⏳ Pending"}
                {task.is_overdue && (
                  <span
                    style={{
                      color: "red",
                      fontWeight: "bold",
                      marginLeft: "10px",
                    }}
                  >
                    (OVERDUE)
                  </span>
                )}
                <div style={{ marginTop: "5px" }}>
                  <small style={{ color: "#777" }}>
                    Category: {task.category?.name || "Uncategorized"}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default App;
