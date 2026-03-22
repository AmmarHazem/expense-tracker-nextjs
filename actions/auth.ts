"use server";

import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { seedUserData } from "@/lib/seed-user";

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<{ error?: string }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const hashedPassword = await hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  try {
    await seedUserData(user.id);
  } catch (e) {
    console.error("Seed error on register:", e);
  }

  return {};
}

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }
      return { error: "Something went wrong. Please try again." };
    }
    // signIn throws a redirect on success — re-throw it so Next.js handles it
    throw error;
  }
  return {};
}
