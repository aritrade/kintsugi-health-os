import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Pwa } from "@/components/pwa";

export const metadata: Metadata = {
  title: "Kintsugi Health OS",
  description:
    "A privacy-first Personal Health Operating System. Investigation, not diagnosis.",
  applicationName: "Kintsugi Health OS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kintsugi",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f6f54",
};

// Applies the saved (or system) theme before paint to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Pwa />
      </body>
    </html>
  );
}
