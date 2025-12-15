import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";

const mockGames = [
  { id: 1, title: "1 vs 1", status: "개발 중", description: "게임 소개" },
];

export default async function GamesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-12 lg:py-16 space-y-8">
          <div className="flex flex-col gap-4">
            {mockGames.map((game) => (
              <div
                key={game.id}
                aria-disabled="true"
                className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-md min-h-[160px] transition opacity-70 cursor-not-allowed select-none"
                title="개발 중입니다."
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{game.title}</h2>
                  <span className="text-xs text-muted-foreground">{game.status}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{game.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}

