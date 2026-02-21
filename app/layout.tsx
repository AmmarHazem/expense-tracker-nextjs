import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { DesignThemeProvider } from "@/components/providers/DesignThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track your expenses with style",
};

// Inline script run before React hydration to prevent flash of wrong design theme
const designThemeScript = `(function(){try{var t=localStorage.getItem('design-theme');document.documentElement.setAttribute('data-design-theme',t==='ios'||t==='brutalist'?t:'brutalist');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: designThemeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <DesignThemeProvider>
            <SessionProvider>{children}</SessionProvider>
          </DesignThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
