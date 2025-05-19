import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Toaster } from 'sonner'; // Import Toaster

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-playfair-display',
});

export const metadata: Metadata = {
  title: "Vox Eternal",
  description: "Tu voz. Tus recuerdos. Para siempre.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${playfairDisplay.variable}`}>
      <body className={`${inter.className} antialiased bg-blanco-hueso pt-16 flex flex-col min-h-screen`}>
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <Toaster richColors position="bottom-right" /> {/* Add Toaster component */}
      </body>
    </html>
  );
}
