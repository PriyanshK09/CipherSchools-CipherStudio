import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import IDE from "./components/IDE.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Examples from "./pages/Examples.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  Sparkles,
  HelpCircle,
  BookOpen,
  History,
  Sun,
  Moon,
  Code2,
  Zap,
  ShieldCheck,
  Cloud,
  Users,
  Puzzle,
  Search,
  Maximize
} from "lucide-react";
import { useProject } from "./context/ProjectContext.jsx";
import Footer from "./components/Footer.jsx";

const RequireAuth = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
};

const GuestOnly = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/ide" replace />;
  }
  return children;
};

const NavigationBar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isIDE = location.pathname.includes('/ide');
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const menuRef = useRef(null);
  const helpRef = useRef(null);
  const initials = (user?.name || user?.email || "").trim().split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase() || "U";

  // Render-only theme toggle that consumes ProjectContext when available (IDE routes)
  const ThemeToggleMenuItem = ({ onDone }) => {
    const { theme, toggleTheme } = useProject();
    return (
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-900/70"
        onClick={() => { toggleTheme(); onDone?.(); }}
      >
        {theme === 'dark' ? <Sun size={14} className="text-slate-400" /> : <Moon size={14} className="text-slate-400" />}
        Theme: {theme}
      </button>
    );
  };

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') { setMenuOpen(false); setHelpOpen(false); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:bg-slate-950/55">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 text-xl font-semibold text-amber-400">
          <img
            src="/favicon.ico"
            alt="CipherStudio logo"
            className="h-9 w-9 rounded-full object-cover ring-1 ring-amber-500/25"
            loading="eager"
          />
          <span className="leading-none">CipherStudio</span>
        </Link>

        {/* Right actions */}
        <nav className="flex items-center gap-2 text-sm text-slate-300">
          {isAuthenticated ? (
            <>
              {/* Help dropdown */}
              <div className="relative" ref={helpRef}>
                <button
                  type="button"
                  onClick={() => setHelpOpen(v => !v)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/60 text-slate-200 transition hover:border-amber-500/60 hover:bg-slate-900/80"
                  aria-haspopup="menu"
                  aria-expanded={helpOpen}
                  title="Help"
                >
                  <HelpCircle size={16} />
                </button>
                {helpOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-slate-800/70 bg-slate-950/95 text-slate-200 shadow-xl">
                    <a
                      href="https://github.com/PriyanshK09/CipherSchools-CipherStudio/tree/main/Documentations"
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-900/70"
                    >
                      <BookOpen size={14} className="text-slate-400" /> Docs
                    </a>
                    <a
                      href="https://github.com/PriyanshK09/CipherSchools-CipherStudio/commits/main"
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-900/70"
                    >
                      <History size={14} className="text-slate-400" /> Changelog
                    </a>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate(`/workspace/${crypto.randomUUID()}/ide`)}
                className="inline-flex h-9 items-center rounded-md bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400"
                title="Create a new workspace"
              >
                New Workspace
              </button>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(v => !v)}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700/70 bg-slate-900/60 px-2 pl-2.5 pr-3 text-sm text-slate-200 transition hover:border-amber-500/60 hover:bg-slate-900/80"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-200 ring-1 ring-slate-700/70">{initials}</span>
                  <span className="hidden sm:inline truncate max-w-[12ch] text-slate-300">{user?.name || user?.email}</span>
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-slate-800/70 bg-slate-950/95 text-slate-200 shadow-xl"
                  >
                    <div className="px-3 py-2 text-xs text-slate-400">Signed in as<br /><span className="text-slate-300">{user?.email || user?.name}</span></div>
                    <div className="h-px bg-slate-800/70" />
                    {isIDE && (
                      <ThemeToggleMenuItem onDone={() => setMenuOpen(false)} />
                    )}
                    <div className="h-px bg-slate-800/70" />
                    <Link
                      to="/dashboard"
                      role="menuitem"
                      className="block px-4 py-2 text-sm hover:bg-slate-900/70"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-900/70"
                      onClick={() => { setMenuOpen(false); logout(); }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex h-9 items-center rounded-md border border-slate-700/80 px-4 text-sm transition hover:border-amber-500/70 hover:bg-slate-900/60"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex h-9 items-center rounded-md bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

const Breadcrumbs = () => {
  const location = useLocation();
  const segments = useMemo(() => location.pathname.split('/').filter(Boolean), [location.pathname]);
  // Hide on landing and IDE to avoid layout conflicts
  if (location.pathname === '/' || location.pathname.includes('/ide')) return null;
  let acc = '';
  return (
    <div className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-2 text-sm text-slate-400">
        <Link to="/" className="hover:text-slate-200">Home</Link>
        {segments.map((seg, idx) => {
          acc += `/${seg}`;
          const last = idx === segments.length - 1;
          const label = decodeURIComponent(seg).replace(/[-_]/g, ' ');
          return (
            <span key={acc} className="inline-flex items-center gap-2">
              <span className="text-slate-600">/</span>
              {last ? (
                <span className="capitalize text-slate-300">{label}</span>
              ) : (
                <Link to={acc} className="capitalize hover:text-slate-200">{label}</Link>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-slate-950">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.03)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      
      {/* Floating icons */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="floating-icon absolute left-[10%] top-[15%] text-amber-500/20">
          <Code2 size={32} />
        </div>
        <div className="floating-icon-delayed absolute right-[15%] top-[20%] text-amber-500/15">
          <Zap size={28} />
        </div>
        <div className="floating-icon absolute left-[8%] bottom-[25%] text-amber-500/10">
          <Cloud size={36} />
        </div>
        <div className="floating-icon-delayed absolute right-[12%] bottom-[30%] text-amber-500/20">
          <Users size={30} />
        </div>
        <div className="floating-icon absolute left-[18%] top-[45%] text-amber-500/15">
          <Search size={24} />
        </div>
        <div className="floating-icon-delayed absolute right-[20%] top-[60%] text-amber-500/10">
          <ShieldCheck size={32} />
        </div>
        <div className="floating-icon absolute left-[85%] top-[40%] text-amber-500/15">
          <Code2 size={26} />
        </div>
        <div className="floating-icon-delayed absolute left-[75%] bottom-[15%] text-amber-500/20">
          <Zap size={30} />
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 text-center">
        {/* Hero content */}
        <div className="space-y-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-sm font-medium text-amber-400/90 backdrop-blur-sm">
            <Code2 size={14} />
            <span className="tracking-wide">Browser-based development environment</span>
          </div>

          <h1 className="text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-50 sm:text-7xl lg:text-7xl">
            Code, preview,{' '}
            <span className="relative inline-block">
              <span className="absolute -inset-1 bg-amber-500/20 blur-2xl" />
              <span className="relative text-amber-500">deploy</span>
            </span>
            <br />
            <span className="bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 bg-clip-text text-transparent">
              All in your browser.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-slate-400/90 font-light">
            A full-featured IDE that runs entirely in your browser. Write code, see instant previews, and collaborate in real-time. No setup required.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
            <button
              onClick={() => navigate(isAuthenticated ? `/workspace/${crypto.randomUUID()}/ide` : "/register")}
              className="group inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              {isAuthenticated ? "New Workspace" : "Get Started"}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-6 py-3 text-base font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900/50"
            >
              View Dashboard
            </Link>
            <Link
              to="/example"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-6 py-3 text-base font-medium text-amber-300 transition hover:bg-amber-500/20"
            >
              Try Examples
            </Link>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-8 text-sm text-slate-400">
            {['Live preview', 'Cloud sync', 'Instant setup', 'No installation'].map((feat) => (
              <div key={feat} className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1.5">
                <div className="h-1 w-1 rounded-full bg-amber-500" />
                {feat}
              </div>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-24 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Zap size={18} />, title: 'Instant Preview', desc: 'See your changes in real-time with hot module replacement' },
            { icon: <Cloud size={18} />, title: 'Auto-save', desc: 'Your work is automatically saved to the cloud and locally' },
            { icon: <Users size={18} />, title: 'Collaborate', desc: 'Share workspaces and work together with your team' },
            { icon: <Search size={18} />, title: 'Smart Search', desc: 'Powerful search with regex, case matching, and file filtering' },
            { icon: <ShieldCheck size={18} />, title: 'Secure', desc: 'JWT authentication and role-based access control' },
            { icon: <Code2 size={18} />, title: 'React Ready', desc: 'Optimized for React with support for modern frameworks' },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group rounded-lg border border-slate-800/50 bg-slate-900/30 p-5 transition hover:border-slate-700 hover:bg-slate-900/50"
            >
              <div className="mb-3 inline-flex rounded-md bg-amber-500/10 p-2 text-amber-400 transition group-hover:bg-amber-500/20">
                {feature.icon}
              </div>
              <h3 className="mb-1 font-semibold text-slate-200">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA footer */}
        <div className="mt-24 rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-8">
          <h2 className="mb-3 text-2xl font-bold text-slate-100">Ready to start building?</h2>
          <p className="mb-6 text-slate-400">
            Create your first workspace in seconds. No credit card required.
          </p>
          <button
            onClick={() => navigate(isAuthenticated ? `/workspace/${crypto.randomUUID()}/ide` : "/register")}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
          >
            {isAuthenticated ? "Create Workspace" : "Sign Up Free"}
          </button>
        </div>
      </div>
    </main>
  );
};

const App = () => {
  const location = useLocation();
  const isIDE = location.pathname.includes("/ide");
  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 ${isIDE ? "" : "pb-8"}`}>
      <NavigationBar />
      <Breadcrumbs />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/example" element={<Examples />} />
        <Route
          path="/ide"
          element={
            <RequireAuth>
              <IDE />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/workspace/:workspaceId/ide"
          element={
            <RequireAuth>
              <IDE />
            </RequireAuth>
          }
        />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <Register />
            </GuestOnly>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Show marketing footer on non-IDE routes to avoid layout conflicts */}
      {!isIDE && <Footer />}
    </div>
  );
};

export default App;
