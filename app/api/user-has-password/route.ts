import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Intentionally reveals only whether a credential record exists — not the
// password hash, user id, or any other PII. Used by the login form to decide
// whether to enforce the password-policy checklist client-side.
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim();
  if (!username) {
    return NextResponse.json({ hasPassword: false });
  }

  const normalized = username.replace(/[\p{P}\p{S}\s]+/gu, "").toLowerCase();

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT u.id FROM users u
      JOIN accounts a ON a.user_id = u.id AND a.provider_id = 'credential'
      WHERE LOWER(REGEXP_REPLACE(u.username, '[[:punct:][:space:]]', '', 'g')) = ${normalized}
        AND a.password IS NOT NULL
      LIMIT 1
    `;
    return NextResponse.json({ hasPassword: rows.length > 0 });
  } catch {
    // On DB error, assume no password (first-login) so checklist shows
    return NextResponse.json({ hasPassword: false });
  }
}
