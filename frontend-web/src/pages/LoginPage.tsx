import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { API, getErrorMessage } from "../api/client";

export default function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoggedIn) {
    navigate("/", { replace: true });
    return null;
  }

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegistering) {
        await API.post("/register/", {
          username,
          password,
          confirm_pass: confirmPassword,
        });
      }
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section className="mx-auto mt-12 grid max-w-3xl gap-8 border border-[#173b35]/15 border-l-4 border-l-[#176b57] bg-white p-6 shadow-[0_16px_36px_rgba(23,59,53,0.08)] md:grid-cols-[0.8fr_1.2fr] md:p-10">
      <div>
        <p className="font-['Spectral',Georgia,serif] text-[13px] italic text-[#2d8068]">
          Account portal
        </p>
        <h2 className="mt-2 font-['Spectral',Georgia,serif] text-3xl font-medium text-[#173b35]">
          {isRegistering ? "Create your reading desk" : "Sign in to your desk"}
        </h2>
        <p className="text-sm text-[#173b35]/65">
          {isRegistering
            ? "Create an account to save books and manage tasks."
            : "Log in to manage tasks and save your reading."}
        </p>
      </div>

      {error && (
        <div
          className="col-span-full border border-[#c85a50] bg-[#fff0ee] p-3 text-xs text-[#a13e38]"
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
          className="h-11 border-0 border-b border-[#173b35]/25 bg-transparent px-1 text-sm text-[#173b35] focus:border-[#176b57] focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 border-0 border-b border-[#173b35]/25 bg-transparent px-1 text-sm text-[#173b35] focus:border-[#176b57] focus:outline-none"
          required
        />
        {isRegistering && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 border-0 border-b border-[#173b35]/25 bg-transparent px-1 text-sm text-[#173b35] focus:border-[#176b57] focus:outline-none"
            required
          />
        )}
        <button
          className="inline-flex h-11 items-center justify-center gap-1 bg-[#176b57] px-4 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#125342]"
          type="submit"
        >
          {isRegistering ? <UserPlus size={16} /> : <LogIn size={16} />}
          {isRegistering ? "Create account" : "Log in"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setIsRegistering((current) => !current);
          setError(null);
          setConfirmPassword("");
        }}
        className="text-left text-xs font-semibold text-[#c95543] underline underline-offset-4 hover:text-[#9f392d]"
      >
        {isRegistering
          ? "Already have an account? Log in"
          : "New here? Create an account"}
      </button>
    </section>
  );
}
