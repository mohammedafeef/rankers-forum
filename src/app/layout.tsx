import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/react-query";
import { AuthProvider } from "@/lib/hooks";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Rankers Forum | NEET College Predictions & Admissions",
  description: "Find eligible medical colleges based on your NEET rank. Get personalized predictions, previous year data, and expert guidance for your medical career.",
  keywords: ["NEET", "medical colleges", "college predictions", "MBBS admissions", "rank predictions"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
