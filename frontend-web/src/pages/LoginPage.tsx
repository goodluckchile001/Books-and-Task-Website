import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../api/client";

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
    <section className="auth-portal auth-page">
      <div className="auth-copy">
        <p className="eyebrow">ACCOUNT PORTAL</p>
        <h3>Sign in to your desk</h3>
        <p>Log in to manage tasks and save your reading.</p>
      </div>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

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
    </section>
  );
}
