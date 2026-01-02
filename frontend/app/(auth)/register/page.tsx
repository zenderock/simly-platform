"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Atom, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuth((state) => state.setAuth);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await api.post("/auth/register", { name, email, password });
      const { token, user } = response.data;
      
      setAuth(token, user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground">
          Get started with Simly today - it's free
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Full name
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            required
            disabled={isLoading}
            className="h-11"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
          <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Create a strong password"
            required
            disabled={isLoading}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters long
          </p>
        </div>
        <Button type="submit" className="w-full h-11 mt-2" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Already have an account?
          </span>
        </div>
      </div>
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8 w-full"
        >
          Sign in instead
        </Link>
      </div>
    </div>
  );
}
