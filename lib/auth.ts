import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "./prisma";
import { recordAndCheck, resetOnSuccess } from "./rate-limit";

async function findUserByNormalizedUsername(input: string) {
  // Strip whitespace and punctuation/symbols so login is tolerant of both
  // (e.g. "john.doe", "john doe" and "johndoe" all match). Letters of any
  // alphabet (incl. Cyrillic) and digits are preserved.
  const normalized = input.replace(/[\p{P}\p{S}\s]+/gu, "").toLowerCase();
  const rows = await prisma.$queryRaw<
    Array<{ id: string; username: string; name: string; role: string }>
  >`
    SELECT id, username, name, role FROM users
    WHERE LOWER(REGEXP_REPLACE(username, '[[:punct:][:space:]]', '', 'g')) = ${normalized}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    "http://localhost:3000",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [
    username({
      usernameNormalization: false,
      usernameValidator: async () => true,
      minUsernameLength: 1,
      maxUsernameLength: 100,
    }),
  ],
  emailAndPassword: {
    enabled: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/username") {
        const body = ctx.body as { username?: string; password?: string };
        if (!body.username || !body.password) return;

        const ip =
          ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
        const { blocked, retryAfter } = await recordAndCheck(ip, body.username);
        if (blocked) {
          const minutes = Math.ceil(retryAfter / 60);
          throw new APIError("TOO_MANY_REQUESTS", {
            message: `Слишком много попыток. Повторите через ${minutes} мин.`,
          });
        }

        const user = await findUserByNormalizedUsername(body.username);
        if (!user) return;

        // Replace input with canonical username so better-auth can find the user
        body.username = user.username;

        const account = await prisma.account.findFirst({
          where: { userId: user.id, providerId: "credential" },
        });

        if (!account || account.password === null) {
          const hashed = await hashPassword(body.password);
          if (!account) {
            await prisma.account.create({
              data: {
                id: crypto.randomUUID(),
                accountId: user.id,
                providerId: "credential",
                password: hashed,
                userId: user.id,
              },
            });
          } else {
            await prisma.account.update({
              where: { id: account.id },
              data: { password: hashed },
            });
          }
        }
        return;
      }

      if (ctx.path === "/sign-out") {
        try {
          const cookieHeader = ctx.headers?.get("cookie") ?? "";
          const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
          const token = match?.[1] ? decodeURIComponent(match[1]) : null;
          if (token) {
            const session = await prisma.session.findUnique({
              where: { token },
              select: { userId: true, ipAddress: true, userAgent: true },
            });
            if (session) {
              const ip =
                ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
                session.ipAddress ??
                null;
              const ua = ctx.headers?.get("user-agent") ?? session.userAgent ?? null;
              await prisma.auditLog.create({
                data: {
                  userId: session.userId,
                  action: "LOGOUT",
                  entity: "session",
                  ipAddress: ip,
                  userAgent: ua,
                  meta: {},
                },
              });
            }
          }
        } catch { }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/username") return;

      // Only reset counter and log LOGIN if the request was successful
      if (ctx.context.returned instanceof APIError) return;

      const body = ctx.body as { username?: string };
      if (!body?.username) return;

      const user =
        (await prisma.user.findUnique({ where: { username: body.username } })) ??
        (await findUserByNormalizedUsername(body.username));
      if (!user) return;

      const ip =
        ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        ctx.headers?.get("x-real-ip") ??
        null;
      const ua = ctx.headers?.get("user-agent") ?? null;

      // Reset attempt counter on successful sign-in
      try {
        await resetOnSuccess(ip ?? "127.0.0.1", body.username);
      } catch { }

      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            entity: "session",
            ipAddress: ip,
            userAgent: ua,
            meta: { username: user.username, name: user.name, role: user.role },
          },
        });
      } catch { }
    }),
  },
});
