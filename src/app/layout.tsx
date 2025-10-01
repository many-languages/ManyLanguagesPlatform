import "./global.css"
import { Inter } from "next/font/google"
import { BlitzProvider } from "./blitz-client"

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
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <BlitzProvider>
          <main className="min-h-screen flex flex-col">{children}</main>
        </BlitzProvider>
      </body>
    </html>
  )
}
