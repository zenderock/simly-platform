"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LoaderQuater from "@/components/loader";

import { Turnstile } from "@marsidev/react-turnstile";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth((state) => state.setAuth);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(
    null
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!turnstileToken) {
      setError("Please complete the security check.");
      return;
    }

    setIsLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
        turnstile_token: turnstileToken,
      });
      const { token, user } = response.data;

      setAuth(token, user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to login. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to your Simly account to continue
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="grid gap-2">
          <label
            htmlFor="email"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Email address
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            disabled={isLoading}
            className="h-11"
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Password
            </label>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            disabled={isLoading}
            className="h-11"
          />
        </div>

        <div className="flex justify-center py-2">
          <Turnstile
            siteKey={
              process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
              "1x00000000000000000000AA"
            }
            onSuccess={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setError("Security check failed. Please refresh.")}
            options={{
              theme: "auto",
            }}
          />
        </div>

        <Button type="submit" className="w-full h-11 mt-2" disabled={isLoading}>
          {isLoading && <LoaderQuater className="mr-2 h-4 w-4" />}
          Sign In
        </Button>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            New to Simly?
          </span>
        </div>
      </div>
      <div className="text-center">
        <Link
          href="/register"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8 w-full"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
