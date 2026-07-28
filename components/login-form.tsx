"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PasswordRequirements } from "@/components/password-requirements";
import { isPasswordValid } from "@/lib/password";

const schema = z.object({
  username: z.string().min(1, "Введите логин"),
  password: z
    .string()
    .min(1, "Введите пароль")
    .refine(isPasswordValid, "Пароль не соответствует требованиям"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const tokenResolveRef = useRef<((token: string | null) => void) | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const passwordValue = watch("password") ?? "";

  function requestToken(): Promise<string | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        tokenResolveRef.current = null;
        resolve(null);
      }, 15000);
      tokenResolveRef.current = (token) => {
        clearTimeout(timer);
        resolve(token);
      };
      turnstileRef.current?.reset();
      turnstileRef.current?.execute();
    });
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const turnstileToken =
      process.env.NODE_ENV === "development" ? "dev" : await requestToken();
    if (!turnstileToken) {
      setServerError("Проверка безопасности не пройдена");
      return;
    }

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: values.username,
        password: values.password,
        turnstileToken,
      }),
    });

    let data: { error?: string } = {};
    try {
      data = await res.json();
    } catch {
      // response was not JSON
    }

    if (!res.ok) {
      setServerError(data.error ?? "Неверный логин или пароль");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <motion.div
      className="w-full max-w-sm"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="w-full max-w-sm hover:translate-y-0 hover:shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl">Вход</CardTitle>
          <CardDescription>
            При первом входе придумайте пароль по требованиям ниже
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" required>Логин</Label>
              <Input
                id="username"
                placeholder="Иванов И.И."
                autoComplete="username"
                aria-invalid={!!errors.username}
                className={cn(errors.username && "border-destructive")}
                {...register("username")}
              />
              {errors.username && (
                <p key={errors.username.message} className="text-destructive text-xs animate-slide-down">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" required>Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  className={cn(
                    "pr-10 [&::-ms-reveal]:hidden",
                    errors.password && "border-destructive",
                  )}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? (
                    <IconEyeOff size={18} />
                  ) : (
                    <IconEye size={18} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p key={errors.password.message} className="text-destructive text-xs animate-slide-down">
                  {errors.password.message}
                </p>
              )}
              <PasswordRequirements value={passwordValue} />
            </div>

            {serverError && (
              <p key={serverError} className="text-destructive text-sm animate-slide-down animate-shake">
                {serverError}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-1">
              {isSubmitting ? "Вход..." : "Войти"}
            </Button>
          </form>

          {/* Rendered outside <form>. execution="execute" — challenge only fires on requestToken() call */}
          <Turnstile
            ref={turnstileRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            options={{ execution: "execute", responseField: false }}
            onSuccess={(token) => {
              if (tokenResolveRef.current) {
                tokenResolveRef.current(token);
                tokenResolveRef.current = null;
              }
            }}
            onError={() => {
              if (tokenResolveRef.current) {
                tokenResolveRef.current(null);
                tokenResolveRef.current = null;
              }
            }}
            onExpire={() => {
              if (tokenResolveRef.current) {
                tokenResolveRef.current(null);
                tokenResolveRef.current = null;
              }
            }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
