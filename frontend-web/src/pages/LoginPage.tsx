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
    <section className="mx-auto mt-12 grid max-w-3xl gap-8 border border-[#1c1b17]/15 border-l-4 border-l-[#0f3d2e] bg-[#f3ecd9] p-6 md:grid-cols-[0.8fr_1.2fr] md:p-10">
      <div>
        <p className="font-['Spectral',Georgia,serif] text-[13px] italic text-[#7b2d26]">
          Account portal
        </p>
        <h2 className="mt-2 font-['Spectral',Georgia,serif] text-3xl font-medium text-[#1c1b17]">
          Sign in to your desk
        </h2>
        <p className="text-sm text-[#1c1b17]/65">
          Log in to manage tasks and save your reading.
        </p>
      </div>

      {error && (
        <div
          className="col-span-full border border-[#7b2d26] bg-[#f8ece9] p-3 text-xs text-[#7b2d26]"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="grid gap-3">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="h-11 border-0 border-b border-[#1c1b17]/25 bg-transparent px-1 text-sm text-[#1c1b17] focus:border-[#0f3d2e] focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 border-0 border-b border-[#1c1b17]/25 bg-transparent px-1 text-sm text-[#1c1b17] focus:border-[#0f3d2e] focus:outline-none"
          required
        />
        <button
          className="inline-flex h-11 items-center justify-center gap-1 bg-[#0f3d2e] px-4 text-xs font-semibold text-[#faf6ec] transition-all hover:-translate-y-0.5 hover:bg-[#18533f]"
          type="submit"
        >
          <LogIn size={16} /> Log in
        </button>
      </form>
    </section>
  );
}
