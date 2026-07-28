"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { IconBell, IconBellOff, IconLoader2 } from "@tabler/icons-react";
import { filterKey, type PushFilter } from "@/lib/push-utils";
import { toast } from "sonner";
import { useIosInstallPrompt } from "@/components/ios-install-prompt";
import { Button } from "@/components/ui/button";

interface Props {
  filter: PushFilter;
  vapidPublicKey: string;
}

type State =
  | "loading"
  | "unsupported"
  | "error"
  | "subscribed"
  | "unsubscribed";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export function PushSubscribeButton({ filter, vapidPublicKey }: Props) {
  const mounted = useSyncExternalStore(
    () => () => { },
    () => true,
    () => false,
  );
  const [state, setState] = useState<State>("loading");
  const fKey = filterKey(filter);
  const { showPrompt } = useIosInstallPrompt();

  useEffect(() => {
    if (!mounted) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      Promise.resolve().then(() => setState("unsupported"));
      return;
    }

    async function checkSubscription() {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (!existing) {
        setState("unsubscribed");
        return;
      }

      const res = await fetch(
        `/api/push?endpoint=${encodeURIComponent(existing.endpoint)}&filterKey=${encodeURIComponent(fKey)}`,
      );
      const { subscribed } = await res.json();
      setState(subscribed ? "subscribed" : "unsubscribed");
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(checkSubscription)
      .catch(() => setState("error"));
  }, [fKey, mounted]);

  if (!mounted) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (state === "unsupported" && isIOS && !isStandalone) {
    return (
      <div className="flex flex-col gap-1">
        <Button variant="outline" className="gap-2" onClick={showPrompt}>
          <IconBell size={16} className="text-muted-foreground" />
          Уведомления о заменах
        </Button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <Button
        variant="outline"
        className="gap-2 text-destructive border-destructive/30"
        onClick={() => {
          setState("loading");
          navigator.serviceWorker
            .register("/sw.js")
            .then(async (reg) => {
              const existing = await reg.pushManager.getSubscription();
              setState(existing ? "subscribed" : "unsubscribed");
            })
            .catch(() => {
              setState("error");
              toast.error("Не удалось запустить сервис-воркер", {
                description: "Попробуйте перезагрузить страницу",
              });
            });
        }}
      >
        <IconBell size={16} />
        Ошибка — нажмите для повтора
      </Button>
    );
  }

  async function toggle() {
    if (state === "loading" || state === "unsupported") return;
    setState("loading");

    try {
      const reg = await navigator.serviceWorker.ready;

      // Отписка
      if (state === "subscribed") {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const res = await fetch("/api/push", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint, filterKey: fKey }),
          });
          if (!res.ok)
            throw Object.assign(new Error("server"), { status: res.status });
        }
        setState("unsubscribed");
        toast.success("Уведомления отключены");
        return;
      }

      // Проверяем заранее - браузер мог заблокировать без промпта
      if (Notification.permission === "denied") {
        setState("unsubscribed");
        toast.error("Уведомления заблокированы", {
          description:
            "Разрешите уведомления для этого сайта в настройках браузера",
        });
        return;
      }

      const publicKey = vapidPublicKey;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        } catch (e) {
          setState("unsubscribed");
          if (e instanceof DOMException && e.name === "NotAllowedError") {
            if ((Notification.permission as string) === "denied") {
              toast.error("Уведомления заблокированы", {
                description:
                  "Разрешите уведомления для этого сайта в настройках браузера",
              });
            } else {
              toast("Запрос отклонён", {
                description:
                  "Нажмите «Разрешить» во всплывающем окне браузера, чтобы получать уведомления",
              });
            }
          } else {
            const name =
              e instanceof DOMException
                ? e.name
                : e instanceof Error
                  ? e.name
                  : "Unknown";
            const msg = e instanceof Error ? e.message : String(e);
            toast.error("Не удалось оформить подписку", {
              description: `${name}: ${msg}`,
            });
          }
          return;
        }
      }

      const json = sub.toJSON();
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          filter:
            "groupId" in filter
              ? { groupId: filter.groupId }
              : "teacherId" in filter
                ? { teacherId: filter.teacherId }
                : { room: filter.room },
        }),
      });

      if (!res.ok)
        throw Object.assign(new Error("server"), { status: res.status });

      setState("subscribed");
      toast.success("Уведомления включены", {
        description: "Будете получать уведомления о заменах в расписании",
      });
    } catch (e) {
      setState("unsubscribed");
      if (e instanceof TypeError) {
        toast.error("Нет соединения с сервером", {
          description: "Проверьте подключение к интернету и попробуйте снова",
        });
      } else if (e instanceof Error && e.message === "server") {
        toast.error("Ошибка сервера", {
          description: "Не удалось сохранить подписку. Попробуйте позже",
        });
      } else {
        toast.error("Не удалось подписаться на уведомления");
      }
    }
  }

  if (state === "unsupported") {
    if (isIOS) {
      const hasSW = "serviceWorker" in navigator;
      const hasPush = "PushManager" in window;
      const isHttps = location.protocol === "https:";
      const hint = !isHttps
        ? "Требуется HTTPS-соединение"
        : !hasSW || !hasPush
          ? "Требуется iOS 16.4 или новее"
          : "Уведомления недоступны";
      return (
        <div className="flex flex-col gap-1">
          <Button variant="outline" className="gap-2" disabled>
            <IconBell size={16} className="text-muted-foreground" />
            Уведомления о заменах
          </Button>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={toggle}
      disabled={state === "loading"}
      title={
        state === "subscribed"
          ? "Отписаться от уведомлений"
          : "Подписаться на уведомления о заменах"
      }
    >
      {state === "loading" ? (
        <IconLoader2 size={16} className="animate-spin text-muted-foreground" />
      ) : state === "subscribed" ? (
        <IconBellOff size={16} className="text-muted-foreground" />
      ) : (
        <IconBell size={16} className="text-muted-foreground" />
      )}
      {state === "subscribed" ? "Отписаться" : "Уведомления о заменах"}
    </Button>
  );
}
