"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { IconLock, IconArrowLeft, IconCheck, IconEye, IconEyeOff } from "@tabler/icons-react";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post("/auth/reset-password", { token, password });

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 3000);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token && !success) {
    return (
      <div className="flex flex-col space-y-6 text-center">
        <div className="p-12">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Invalid Link</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">
            This reset link is invalid or has already been used.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors bg-violet-600 text-white hover:bg-violet-700 h-11 px-8 shadow-lg shadow-violet-500/20"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          New Password
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose a strong and memorable password.
        </p>
      </div>

      {success ? (
        <div className="flex flex-col items-center space-y-4 p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl animate-in fade-in zoom-in duration-300">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <IconCheck size={24} />
          </div>
          <div className="text-center">
            <h3 className="font-medium text-emerald-900 dark:text-emerald-100">All set!</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
              Your password has been reset successfully. Redirecting...
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none"
            >
              New Password
            </label>
            <div className="relative">
              <IconLock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 transition-all duration-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium leading-none"
            >
              Confirm Password
            </label>
            <div className="relative">
              <IconCheck
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  confirmPassword && password === confirmPassword
                    ? "text-emerald-500"
                    : "text-slate-400"
                } transition-colors`}
                size={18}
              />
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 transition-all duration-200"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-500 animate-in fade-in-0 slide-in-from-top-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:pointer-events-none disabled:opacity-50 bg-violet-600 text-white hover:bg-violet-700 h-11 px-8 w-full shadow-lg shadow-violet-500/20"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Save New Password"
            )}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-2 transition-colors"
            >
              <IconArrowLeft size={16} />
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600" />
      </div>
    }>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
