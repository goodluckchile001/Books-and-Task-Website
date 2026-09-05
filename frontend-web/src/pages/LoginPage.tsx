import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../api/client";
import "./LoginPage.css";

export default function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isLoggedIn) {
    navigate("/", { replace: true });
    return null;
  }

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section
      className="flex items-center justify-between gap-5 mt-12 p-6 border border-gray-400 border-l-4 rounded-lg bg-white bg-opacity-70"
      style={{ borderLeftColor: "var(--teal)" }}
    >
      <div className="flex-1">
        <p className="text-xs font-black tracking-wider text-teal-700">
          ACCOUNT PORTAL
        </p>
        <h3>Sign in to your desk</h3>
        <p>Log in to manage tasks and save your reading.</p>
      </div>

      {error && (
        <div
          className="mb-5 p-3 text-red-900 bg-red-100 border border-red-300 rounded text-xs"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="h-10 border border-gray-300 rounded px-3 text-gray-900 bg-white bg-opacity-75 w-40"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 border border-gray-300 rounded px-3 text-gray-900 bg-white bg-opacity-75 w-40"
          required
        />
        <button
          className="inline-flex items-center justify-center gap-1 h-10 px-3.5 rounded text-xs font-bold text-white bg-gray-900 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          type="submit"
        >
          <LogIn size={16} /> Log in
        </button>
      </form>
    </section>
  );
}
