import { redirect } from "next/navigation"
import { DEFAULT_ADMIN_PATH } from "@/src/lib/auth/routing"

/** `/admin` has no content of its own — the canonical admin landing page is `/admin/dashboard`. */
export default function AdminIndexPage() {
  redirect(DEFAULT_ADMIN_PATH)
}
