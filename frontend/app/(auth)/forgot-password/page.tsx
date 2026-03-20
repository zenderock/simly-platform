"use client";

import React, { useState } from "react";
import Link from "next/link";
import { IconMail, IconArrowLeft, IconCheck } from "@tabler/icons-react";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot Password?
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter your email address to receive a reset link.
        </p>
      </div>

      {success ? (
        <div className="flex flex-col items-center space-y-4 p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl animate-in fade-in zoom-in duration-300">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <IconCheck size={24} />
          </div>
          <div className="text-center">
            <h3 className="font-medium text-emerald-900 dark:text-emerald-100">Email Sent</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
              If an account is associated with <strong>{email}</strong>, a reset link has been sent.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-2"
          >
            <IconArrowLeft size={16} />
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Email Address
            </label>
            <div className="relative">
              <IconMail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-10 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:pointer-events-none disabled:opacity-50 bg-violet-600 text-white hover:bg-violet-700 h-11 px-8 w-full hover:shadow-lg shadow-violet-500/20"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Send Reset Link"
            )}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-2 transition-colors"
            >
              <IconArrowLeft size={16} />
              Back to login
            </Link>
          </div>
        </form>
      )}

    </div>
  );
}
