import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WaitingRoom } from "@/components/games/waiting-room";
import { createClient } from "@/lib/supabase/server";

export default async function GameRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return redirect("/auth/login");
  }

  const { id: gameId } = await params;
  const currentUserId = data.user.id;
  const currentUserName =
    (data.user.user_metadata as { full_name?: string; display_name?: string } | null)
      ?.display_name ||
    (data.user.user_metadata as { full_name?: string } | null)?.full_name ||
    data.user.email ||
    null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-12 lg:py-16 space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold">대기방</h1>
          </header>
          <section className="space-y-3">
            <WaitingRoom
              gameId={gameId}
              currentUserId={currentUserId}
              currentUserDisplayName={currentUserName}
            />
          </section>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}

