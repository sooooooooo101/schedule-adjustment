import { clearSession } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST() {
  await clearSession();
  return Response.redirect(new URL("/", env().APP_URL), 303);
}
