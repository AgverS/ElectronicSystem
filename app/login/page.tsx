import { LoginForm } from "@/components/login-form";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandMark className="size-10" />
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Электронный журнал
          </h1>
          <p className="text-sm text-muted-foreground">
            Успеваемость, расписание и достижения — в одном месте
          </p>
        </div>
      </div>
      <LoginForm />
    </main>
  );
}
