import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { getUser } from "@/lib/auth/current";

export const metadata = { title: "Sign in · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getUser()) redirect("/");
  const { next } = await searchParams;
  return <LoginForm next={next ?? "/"} />;
}
