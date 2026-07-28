import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/lib/prisma-client";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === Role.ADMIN) redirect("/admin");
  if (user.role === Role.TEACHER) redirect("/teacher");
  redirect("/student");
}
