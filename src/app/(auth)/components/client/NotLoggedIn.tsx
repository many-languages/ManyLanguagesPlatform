import Link from "next/link"

export default function NotLoggedIn() {
  return (
    <main className="flex flex-col items-center justify-center h-full">
      <h1 className="text-2xl font-bold">You must be logged in to view this page</h1>
      <Link className="btn btn-primary mt-4" href="/login">
        Go to Login
      </Link>
    </main>
  )
}
