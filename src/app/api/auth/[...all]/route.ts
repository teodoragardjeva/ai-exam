import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// Better Auth endpoints (sign-in, sign-out, session). Sign-up is disabled in src/lib/auth.ts.
export const dynamic = "force-dynamic";

const handler = (request: Request) => getAuth().handler(request);

export const { GET, POST } = toNextJsHandler(handler);
