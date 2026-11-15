import AuthorsView from "@/components/authors/AuthorsView";
import { listAuthors } from "@/db/queries";

export const metadata = { title: "Authors · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function AuthorsPage() {
  return <AuthorsView authors={await listAuthors()} />;
}
