"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import AuthShell from "./AuthShell";
import { login } from "@/app/login/actions";
import { safeNext } from "@/lib/auth/access";
import { FORM_ERROR } from "@/lib/validation";
import { parseLogin } from "@/lib/validation-users";

const box =
  "flex items-center gap-3 rounded-xl border bg-white px-4 py-3.5 text-slate-500 transition focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-600/20";

export default function LoginForm({ next }: { next: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = { username, password };
    const { errors: found } = parseLogin(raw);
    if (Object.keys(found).length) return setErrors(found as Record<string, string>);
    setErrors({});
    setBusy(true);
    try {
      const res = await login(raw);
      if (res.ok) {
        window.location.href = safeNext(next); // full load so the layout picks up the new session
        return;
      }
      setErrors(res.errors as Record<string, string>);
    } catch {
      setErrors({ [FORM_ERROR]: "Could not sign in. Check your connection and try again." });
    }
    setBusy(false);
  }

  return (
    <AuthShell title="Sign In" subtitle="Access your book inventory and manage operations">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className={`${box} ${errors.username ? "border-red-400" : "border-slate-200"}`}>
            <Mail className="h-5 w-5 shrink-0" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Email address or username"
              autoComplete="username"
              autoFocus
              className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
          {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
        </div>
        <div>
          <label className={`${box} ${errors.password ? "border-red-400" : "border-slate-200"}`}>
            <Lock className="h-5 w-5 shrink-0" />
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="rounded p-1 text-slate-500 hover:text-slate-800"
            >
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </label>
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        </div>
        {errors[FORM_ERROR] && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors[FORM_ERROR]}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9b111e] py-4 text-lg font-semibold text-white shadow-md transition hover:bg-[#7f0d18] disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
          {busy ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthShell>
  );
}
