import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from '@/contexts/AuthContext';
import { UnreadCountProvider } from '@/contexts/UnreadCountContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConditionalLayout from '../components/ConditionalLayout';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tanzania Library Association",
  description: "Tanzania Library and Information Association - Official Website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}>
        
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <UnreadCountProvider>
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
              <ToastContainer 
                position="bottom-right"
                theme="colored"
                className="[&>div]:bg-background! [&>div]:text-foreground! [&>div]:border! [&>div]:border-border!"
                toastClassName="bg-background! text-foreground! border! border-border!"
                progressClassName="bg-primary!"
              />
            </UnreadCountProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
