import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(form);
      const redirectTo = location.state?.from?.pathname ?? "/ide";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? "Unable to log in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12">
      <div className="grid w-full max-w-5xl gap-10 rounded-2xl border border-slate-800/60 bg-slate-950/70 backdrop-blur-xl shadow-[0_25px_60px_-15px_rgba(15,118,230,0.35)] lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-8 border-b border-slate-800/60 px-8 py-10 lg:border-b-0 lg:border-r">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
            CipherStudio
          </span>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-slate-50">Welcome back, creator.</h1>
            <p className="text-base text-slate-400">
              Sign in to resume your projects, sync live previews, and push updates straight from the browser-based IDE.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-300">
            {["Recover your saved work instantly", "Live React preview with every keystroke", "Secure sessions with JWT-ready API"].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-sky-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 px-8 py-10">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-100">Sign in to your workspace</h2>
            <p className="text-sm text-slate-400">Enter your credentials to continue.</p>
          </div>
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="text-slate-300">Email</span>
              <input
                required
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-300">Password</span>
              <input
                required
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>
          </div>
          {error && <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
          <p className="text-center text-sm text-slate-400">
            Need an account? <Link to="/register" className="text-sky-400">Create one</Link>
          </p>
        </form>
      </div>
    </main>
  );
};

export default Login;
