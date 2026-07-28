import { createHmac } from "crypto";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  TEACHER: "Преподаватель",
  STUDENT: "Студент",
};

export function signBlockToken(userId: string): string {
  const secret = process.env.BETTER_AUTH_SECRET!;
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${userId}:${expires}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyBlockToken(token: string): string | null {
  try {
    const secret = process.env.BETTER_AUTH_SECRET!;
    const decoded = Buffer.from(token, "base64url").toString();
    const lastColon = decoded.lastIndexOf(":");
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (sig !== expected) return null;
    const colonIdx = payload.indexOf(":");
    const expires = parseInt(payload.slice(colonIdx + 1), 10);
    if (Date.now() > expires) return null;
    return payload.slice(0, colonIdx);
  } catch {
    return null;
  }
}

export async function sendBugReport(
  user: { id: string; name: string; username: string | null; role: string },
  message: string,
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const role = ROLE_LABELS[user.role] ?? user.role;
  const username = user.username ? ` (@${user.username})` : "";
  const text =
    `🐛 <b>Отчёт об ошибке</b>\n\n` +
    `<b>От:</b> ${escHtml(user.name)}${escHtml(username)}\n` +
    `<b>Роль:</b> ${role}\n\n` +
    `${escHtml(message)}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚫 Заблокировать", callback_data: `block_user:${user.id}` }],
        ],
      },
    }),
  });
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
