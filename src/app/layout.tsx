import "./global.css"
import { Inter } from "next/font/google"
import { BlitzProvider } from "./blitz-client"
import { ThemeProvider } from "next-themes"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: { default: "ManyLanguagesPlatform", template: "%s – Blitz" },
  description: "Online research platform for linguistics studies.",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
          <BlitzProvider>
            <main className="min-h-screen flex flex-col">{children}</main>
          </BlitzProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
