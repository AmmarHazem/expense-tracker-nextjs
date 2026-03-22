"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginWithCredentials } from "@/actions/auth";
import { loginSchema, type LoginInput } from "@/schemas/auth.schema";
import Link from "next/link";

export function EmailSignInForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    const result = await loginWithCredentials(data.email, data.password);
    if (result?.error) {
      setError("root", { message: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="label-mono text-foreground/60 block mb-1">Email</label>
        <input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register("email")}
          className="w-full bg-surface border-2 border-border text-foreground px-3 py-2.5 text-sm font-mono placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-blue-primary"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-500 font-mono">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="label-mono text-foreground/60 block mb-1">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
          className="w-full bg-surface border-2 border-border text-foreground px-3 py-2.5 text-sm font-mono placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-blue-primary"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-500 font-mono">{errors.password.message}</p>
        )}
      </div>

      {errors.root && (
        <p className="text-xs text-red-500 font-mono border border-red-500 px-3 py-2">
          {errors.root.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="brutalist-btn w-full bg-foreground text-background font-bold py-3 px-6 text-sm uppercase tracking-wider disabled:opacity-50"
      >
        {isSubmitting ? "Signing in…" : "Sign In"}
      </button>

      <p className="text-center text-xs text-foreground/50 font-mono">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-blue-primary underline underline-offset-2">
          Create one
        </Link>
      </p>
    </form>
  );
}
