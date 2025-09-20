import Link from "next/link"

export default async function Home() {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <main className="flex flex-col flex-1 items-center justify-center gap-8">
        <h1 className="font-black text-6xl">ManyLanguagesPlatform</h1>

        <div className="flex flex-row gap-4">
          <Link href="/signup" className="btn">
            <strong>Sign Up</strong>
          </Link>
          <Link href="/login" className="btn btn-primary">
            <strong>Login</strong>
          </Link>
        </div>
      </main>

      <footer className="flex p-4 justify-center items-center mt-auto text-sm">
        <span className="mr-1">Powered by</span>
        <a
          href="https://many-languages.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          ManyLanguages
        </a>
      </footer>
    </div>
  )
}
