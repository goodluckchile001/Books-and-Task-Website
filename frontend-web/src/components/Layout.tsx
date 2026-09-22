import { BookOpen, ListChecks, LogIn, LogOut } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Layout() {
  const { isLoggedIn, logout } = useAuth();

  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[1180px] py-10 md:py-16">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&display=swap');`}</style>
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#173b35]/15 pb-6">
        <Link className="flex items-center gap-3 no-underline" to="/">
          <span className="grid h-10 w-10 place-items-center rounded-tr-2xl rounded-bl-sm bg-[#176b57] text-white">
            <BookOpen size={20} />
          </span>
          <span className="block">
            <span className="block font-['Spectral',Georgia,serif] text-[13px] italic text-[#2d8068]">
              PERSONAL LIBRARY
            </span>
            <h1 className="m-0 font-['Spectral',Georgia,serif] text-2xl font-semibold text-[#173b35]">
              Reading desk
            </h1>
          </span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `inline-flex items-center gap-1 px-2.5 py-2 font-['Spectral',Georgia,serif] text-xs font-semibold no-underline transition-colors ${isActive ? "text-[#176b57] border-b-2 border-[#176b57]" : "text-[#173b35]/55 hover:text-[#176b57]"}`
            }
          >
            Library
          </NavLink>
          {isLoggedIn && (
            <NavLink
              to="/tasks"
              className={({ isActive }) =>
                `inline-flex items-center gap-1 px-2.5 py-2 font-['Spectral',Georgia,serif] text-xs font-semibold no-underline transition-colors ${isActive ? "text-[#176b57] border-b-2 border-[#176b57]" : "text-[#173b35]/55 hover:text-[#176b57]"}`
              }
            >
              <ListChecks size={15} /> Tasks
            </NavLink>
          )}
          {isLoggedIn ? (
            <button
              className="inline-flex items-center justify-center gap-1 h-10 px-3.5 border border-[#173b35]/25 text-xs font-semibold text-[#173b35] transition-colors hover:bg-[#e7f3ed]"
              type="button"
              onClick={logout}
            >
              <LogOut size={16} /> Log out
            </button>
          ) : (
            <NavLink
              className={({ isActive }) =>
                `inline-flex items-center gap-1 px-3.5 h-10 text-xs font-semibold text-white no-underline transition-colors ${isActive ? "bg-[#176b57]" : "bg-[#176b57] hover:bg-[#125342]"}`
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
