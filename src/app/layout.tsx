import "./global.css"
import { Inter } from "next/font/google"
import { BlitzProvider } from "./blitz-client"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: { title: "ManyLanguagesPlatform", template: "%s – Blitz" },
  description: "",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        <BlitzProvider>
          <main>{children}</main>
        </BlitzProvider>
      </body>
    </html>
  )
}
