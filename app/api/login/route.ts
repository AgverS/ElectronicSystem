import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkLockout } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  let body: { username?: string; password?: string; turnstileToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const { username, password, turnstileToken } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 });
  }

  // Fast lockout check before any expensive work
  const lockout = await checkLockout(ip, username);
  if (lockout.blocked) {
    const minutes = Math.ceil(lockout.retryAfter / 60);
    return NextResponse.json(
      { error: `Слишком много попыток. Повторите через ${minutes} мин.` },
      { status: 429 },
    );
  }

  // Verify Turnstile (skipped in development)
  if (!turnstileToken || !(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ error: "Проверка безопасности не пройдена" }, { status: 403 });
  }

  // Check password policy for first-login users (no credential account yet).
  // Done here — before better-auth — because APIError from hooks is unreliable.
  try {
    const normalized = username.replace(/[\p{P}\p{S}\s]+/gu, "").toLowerCase();
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT u.id FROM users u
      JOIN accounts a ON a.user_id = u.id AND a.provider_id = 'credential'
      WHERE LOWER(REGEXP_REPLACE(u.username, '[[:punct:][:space:]]', '', 'g')) = ${normalized}
        AND a.password IS NOT NULL
      LIMIT 1
    `;
    if (rows.length === 0) {
      const policyError = validatePassword(password);
      if (policyError) {
        return NextResponse.json({ error: policyError }, { status: 400 });
      }
    }
  } catch {
    // DB error during check — proceed; better-auth will handle auth failure
  }

  // Call better-auth sign-in directly via server API — goes through all hooks
  const fwdHeaders = new Headers();
  if (ip !== "127.0.0.1") fwdHeaders.set("x-forwarded-for", ip);
  const ua = request.headers.get("user-agent");
  if (ua) fwdHeaders.set("user-agent", ua);
  const cookie = request.headers.get("cookie");
  if (cookie) fwdHeaders.set("cookie", cookie);

  let authResponse: Response;
  try {
    authResponse = await auth.api.signInUsername({
      body: { username, password },
      headers: fwdHeaders,
      asResponse: true,
    });
  } catch (err: unknown) {
    // APIError thrown from better-auth before-hooks (e.g. password policy) comes out
    // as a thrown exception even with asResponse:true — handle it explicitly.
    const anyErr = err as { status?: number; body?: { message?: string }; message?: string };
    if (anyErr?.status === 400) {
      return NextResponse.json(
        { error: anyErr.body?.message ?? anyErr.message ?? "Неверный запрос" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  if (!authResponse.ok) {
    // Forward rate-limit errors with proper status so the client shows the right message
    if (authResponse.status === 429) {
      let errBody: { message?: string } = {};
      try { errBody = await authResponse.json(); } catch {}
      const minutes = Math.ceil((errBody.message?.match(/\d+/)?.[0] ? Number(errBody.message.match(/\d+/)?.[0]) : 30));
      return NextResponse.json(
        { error: errBody.message ?? `Слишком много попыток. Повторите через ${minutes} мин.` },
        { status: 429 },
      );
    }
    // Password-policy rejection on first-login password creation
    if (authResponse.status === 400) {
      let errBody: { message?: string } = {};
      try { errBody = await authResponse.json(); } catch {}
      return NextResponse.json(
        { error: errBody.message ?? "Неверный запрос" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const responseBody = await authResponse.json();
  const response = NextResponse.json(responseBody, { status: 200 });

  // Forward session cookies from better-auth
  const cookies = authResponse.headers.getSetCookie?.() ?? [];
  for (const c of cookies) {
    response.headers.append("set-cookie", c);
  }

  return response;
}
