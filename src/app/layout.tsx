import type { Metadata } from "next";
import { Outfit, Noto_Serif } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { getUser } from "@/lib/auth/current";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const serif = Noto_Serif({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Devanagari Prakashan",
  description: "B2B inventory management for book publishing",
};

// Applies the saved theme before first paint to avoid a light/dark flash.
const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Signed-out visitors only ever reach /login (the proxy sends everyone else there), so they get no menu.
  const user = await getUser();
  return (
    <html lang="en" className={`${outfit.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {user ? (
          <div className="flex min-h-screen">
            <Sidebar role={user.role} />
            <div className="flex min-w-0 flex-1 flex-col">
              <Header userName={user.name} role={user.role} />
              <main className="w-full flex-1 px-6 py-8 lg:px-8">{children}</main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
