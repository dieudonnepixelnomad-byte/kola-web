import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/dashboard/login");
  }

  return (
    <div className="grid min-h-screen grid-cols-[232px_1fr]">
      <Sidebar userName={session.user.name ?? session.user.email} />
      <main className="overflow-auto bg-kola-cream-light p-7">{children}</main>
    </div>
  );
}
