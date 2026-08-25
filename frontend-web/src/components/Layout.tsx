import { BookOpen, ListChecks, LogIn, LogOut } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Layout() {
  const { isLoggedIn, logout } = useAuth();

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand-lockup" to="/">
          <span className="brand-mark">
            <BookOpen size={20} />
          </span>
          <span>
            <span className="eyebrow">PERSONAL LIBRARY</span>
            <h1>Reading desk</h1>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/" end>
            Library
          </NavLink>
          {isLoggedIn && (
            <NavLink to="/tasks">
              <ListChecks size={15} /> Tasks
            </NavLink>
          )}
          {isLoggedIn ? (
            <button
              className="button button-ghost"
              type="button"
              onClick={logout}
            >
              <LogOut size={16} /> Log out
            </button>
          ) : (
            <NavLink className="nav-login" to="/login">
              <LogIn size={15} /> Log in
            </NavLink>
          )}
        </nav>
      </header>
      <Outlet />
    </main>
  );
}
