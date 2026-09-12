import { BookOpen, ListChecks, LogIn, LogOut } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Layout() {
  const { isLoggedIn, logout } = useAuth();

  return (
    <main className="w-min(1180px, calc(100% - 40px)) mx-auto py-28">
      <header className="flex items-center justify-between gap-6 pb-7 border-b border-gray-300">
        <Link className="flex items-center gap-3 no-underline" to="/">
          <span
            className="grid place-items-center w-10 h-10 text-white rounded-t-2xl rounded-br-sm"
            style={{ background: "var(--teal)" }}
          >
            <BookOpen size={20} />
          </span>
          <span className="block">
            <span className="block text-xs font-black tracking-wider text-teal-700">
              PERSONAL LIBRARY
            </span>
            <h1 className="m-0 text-2xl font-semibold">Reading desk</h1>
          </span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `inline-flex items-center gap-1 px-2.5 py-2 rounded text-xs font-bold no-underline transition-colors ${isActive ? "text-teal-700 bg-emerald-100" : "text-gray-500 hover:text-teal-700 hover:bg-emerald-100"}`
            }
          >
            Library
          </NavLink>
          {isLoggedIn && (
            <NavLink
              to="/tasks"
              className={({ isActive }) =>
                `inline-flex items-center gap-1 px-2.5 py-2 rounded text-xs font-bold no-underline transition-colors ${isActive ? "text-teal-700 bg-emerald-100" : "text-gray-500 hover:text-teal-700 hover:bg-emerald-100"}`
              }
            >
              <ListChecks size={15} /> Tasks
            </NavLink>
          )}
          {isLoggedIn ? (
            <button
              className="inline-flex items-center justify-center gap-1 h-10 px-3.5 rounded text-xs font-bold border border-gray-300 bg-transparent hover:bg-gray-50 transition-colors"
              type="button"
              onClick={logout}
            >
              <LogOut size={16} /> Log out
            </button>
          ) : (
            <NavLink
              className={({ isActive }) =>
                `inline-flex items-center gap-1 px-3.5 h-10 rounded text-xs font-bold text-white no-underline transition-colors ${isActive ? "bg-gray-800" : "bg-gray-800 hover:opacity-90"}`
              }
              to="/login"
            >
              <LogIn size={15} /> Log in
            </NavLink>
          )}
        </nav>
      </header>
      <Outlet />
    </main>
  );
}
