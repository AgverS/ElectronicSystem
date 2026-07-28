import { prisma } from "@/lib/prisma";

const POLL_TIMEOUT = 30;

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

async function getUpdates(token: string, offset: number): Promise<TelegramUpdate[]> {
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offset,
      timeout: POLL_TIMEOUT,
      allowed_updates: ["message", "callback_query"],
    }),
    signal: AbortSignal.timeout((POLL_TIMEOUT + 5) * 1000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.result ?? [];
}

async function reply(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function answerCallback(token: string, callbackQueryId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function editMessageReplyMarkup(
  token: string,
  chatId: number,
  messageId: number,
  keyboard: { text: string; callback_data: string }[][],
) {
  await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: keyboard } }),
  });
}

async function handleUnblock(token: string, chatId: number, args: string) {
  const username = args.replace(/^@/, "").trim();
  if (!username) {
    await reply(token, chatId, "Использование: /unblock <username>");
    return;
  }

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, name: true, reportBlocked: true },
  });

  if (!user) {
    await reply(token, chatId, `Пользователь «${username}» не найден.`);
    return;
  }

  if (!user.reportBlocked) {
    await reply(token, chatId, `${user.name} не заблокирован.`);
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { reportBlocked: false } });
  await reply(token, chatId, `✅ ${user.name} разблокирован — отчёты снова принимаются.`);
}

async function handleBlockCallback(token: string, callbackQueryId: string, chatId: number, messageId: number, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, reportBlocked: true },
  });

  if (!user) {
    await answerCallback(token, callbackQueryId, "Пользователь не найден.");
    return;
  }

  if (user.reportBlocked) {
    await answerCallback(token, callbackQueryId, `${user.name} уже заблокирован.`);
    await editMessageReplyMarkup(token, chatId, messageId, [
      [{ text: "✅ Разблокировать", callback_data: `unblock_user:${userId}` }],
    ]);
    return;
  }

  await prisma.user.update({ where: { id: userId }, data: { reportBlocked: true } });
  await answerCallback(token, callbackQueryId, `🚫 ${user.name} заблокирован.`);
  await editMessageReplyMarkup(token, chatId, messageId, [
    [{ text: "✅ Разблокировать", callback_data: `unblock_user:${userId}` }],
  ]);
}

async function handleUnblockCallback(token: string, callbackQueryId: string, chatId: number, messageId: number, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, reportBlocked: true },
  });

  if (!user) {
    await answerCallback(token, callbackQueryId, "Пользователь не найден.");
    return;
  }

  if (!user.reportBlocked) {
    await answerCallback(token, callbackQueryId, `${user.name} не заблокирован.`);
    await editMessageReplyMarkup(token, chatId, messageId, [
      [{ text: "🚫 Заблокировать", callback_data: `block_user:${userId}` }],
    ]);
    return;
  }

  await prisma.user.update({ where: { id: userId }, data: { reportBlocked: false } });
  await answerCallback(token, callbackQueryId, `✅ ${user.name} разблокирован.`);
  await editMessageReplyMarkup(token, chatId, messageId, [
    [{ text: "🚫 Заблокировать", callback_data: `block_user:${userId}` }],
  ]);
}

async function processUpdate(token: string, allowedChatId: string, update: TelegramUpdate) {
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat.id;
    const messageId = cb.message?.message_id;
    if (!chatId || !messageId) return;
    if (String(chatId) !== allowedChatId) return;

    if (cb.data?.startsWith("block_user:")) {
      const userId = cb.data.slice("block_user:".length);
      await handleBlockCallback(token, cb.id, chatId, messageId, userId);
    } else if (cb.data?.startsWith("unblock_user:")) {
      const userId = cb.data.slice("unblock_user:".length);
      await handleUnblockCallback(token, cb.id, chatId, messageId, userId);
    }
    return;
  }

  const msg = update.message;
  if (!msg?.text) return;
  if (String(msg.chat.id) !== allowedChatId) return;

  const text = msg.text.trim();
  if (text.startsWith("/unblock")) {
    const args = text.slice("/unblock".length).trim();
    await handleUnblock(token, msg.chat.id, args);
  }
}

export function startTelegramPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const botToken: string = token;
  const allowedChat: string = chatId;
  let offset = 0;

  async function poll() {
    while (true) {
      try {
        const updates = await getUpdates(botToken, offset);
        for (const update of updates) {
          await processUpdate(botToken, allowedChat, update);
          offset = update.update_id + 1;
        }
      } catch {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  poll();
}
