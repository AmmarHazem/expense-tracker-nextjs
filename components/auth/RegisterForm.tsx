"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerUser } from "@/actions/auth";
import { registerSchema, type RegisterInput } from "@/schemas/auth.schema";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterInput) => {
    const result = await registerUser(data.name, data.email, data.password);
    if (result?.error) {
      setError("root", { message: result.error });
    } else {
      router.push("/login?registered=1");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="label-mono text-foreground/60 block mb-1">Name</label>
        <input
          type="text"
          autoComplete="name"
          placeholder="Your name"
          {...register("name")}
          className="w-full bg-surface border-2 border-border text-foreground px-3 py-2.5 text-sm font-mono placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-blue-primary"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500 font-mono">{errors.name.message}</p>
        )}
      </div>

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
          autoComplete="new-password"
          placeholder="••••••••"
          {...register("password")}
          className="w-full bg-surface border-2 border-border text-foreground px-3 py-2.5 text-sm font-mono placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-blue-primary"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-500 font-mono">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="label-mono text-foreground/60 block mb-1">Confirm Password</label>
        <input
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          {...register("confirmPassword")}
          className="w-full bg-surface border-2 border-border text-foreground px-3 py-2.5 text-sm font-mono placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-blue-primary"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-500 font-mono">{errors.confirmPassword.message}</p>
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
        {isSubmitting ? "Creating account…" : "Create Account"}
      </button>

      <p className="text-center text-xs text-foreground/50 font-mono">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-primary underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
