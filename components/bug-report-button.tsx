"use client";

import React, { useState, useEffect, useRef } from "react";
import { IconBug, IconLoader2, IconSend } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [cooldown > 0]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setCooldown(180);
    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.status === 403) {
        setCooldown(0);
        setError("Отправка отчётов для вашего аккаунта ограничена.");
      } else if (res.status === 429) {
        const data = await res.json();
        setCooldown(data.retryAfter ?? 180);
      } else if (!res.ok) {
        setCooldown(0);
        setError("Не удалось отправить. Попробуйте позже.");
      } else {
        setMessage("");
        setOpen(false);
        toast.success("Отчёт отправлен. Спасибо!");
      }
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setError(null);
    setOpen(true);
  }

  const mm = String(Math.floor(cooldown / 60)).padStart(2, "0");
  const ss = String(cooldown % 60).padStart(2, "0");

  return (
    <>
      <button
        onClick={handleOpen}
        title="Сообщить об ошибке"
        className="rounded-md p-1.5 text-muted-foreground/50 transition-all duration-300 hover:bg-muted hover:text-foreground hover:rotate-12 active:scale-90"
      >
        <IconBug size={16} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сообщить об ошибке</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              className="min-h-[120px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              placeholder="Опишите, что пошло не так…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              disabled={loading}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !message.trim() || cooldown > 0}
              >
                {cooldown > 0 ? (
                  `${mm}:${ss}`
                ) : (
                  <>
                    {loading ? (
                      <IconLoader2 size={14} className="animate-spin" />
                    ) : (
                      <IconSend size={14} />
                    )}
                    Отправить
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
