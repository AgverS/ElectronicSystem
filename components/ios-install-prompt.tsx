"use client";

import {
  useState,
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconShare, IconSquarePlus } from "@tabler/icons-react";
import { Button } from "./ui/button";
import Image from "next/image";

interface IosInstallContextType {
  showPrompt: () => void;
  isIosNotInstalled: boolean;
}

const IosInstallContext = createContext<IosInstallContextType | null>(null);

export function useIosInstallPrompt() {
  const context = useContext(IosInstallContext);
  if (!context) {
    throw new Error(
      "useIosInstallPrompt must be used within IosInstallProvider",
    );
  }
  return context;
}

export function IosInstallProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const isIosNotInstalled = useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === "undefined") return false;
      const isIos =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      return isIos && !isStandalone;
    },
    () => false,
  );

  const showPrompt = () => {
    if (isIosNotInstalled) {
      setIsOpen(true);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  return (
    <IosInstallContext.Provider value={{ showPrompt, isIosNotInstalled }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border">
                  <Image
                    src="/logo.svg"
                    alt="Logo"
                    className="h-full w-full object-cover"
                    width={48}
                    height={48}
                  />
                </div>
                <DialogTitle className="text-xl leading-tight">
                  Установить приложение
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="pt-2 text-left text-base text-foreground">
              Чтобы получать уведомления на iPhone, необходимо добавить
              приложение на главный экран.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <IconShare size={24} className="text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">1. Нажмите на кнопку «Поделиться»</p>
                <p className="text-sm text-muted-foreground">
                  Она находится в нижней части экрана браузера Safari.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <IconSquarePlus size={24} className="text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">2. Выберите «На экран Домой»</p>
                <p className="text-sm text-muted-foreground">
                  Прокрутите список действий вниз, чтобы найти этот пункт.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              onClick={handleDismiss}
              className="w-full rounded-xl py-6 text-lg"
            >
              Понятно
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </IosInstallContext.Provider>
  );
}
