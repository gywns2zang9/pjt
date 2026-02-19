import { unstable_noStore as noStore } from "next/cache";

import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Guestbook } from "@/components/guestbook";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  noStore();
  const supabase = await createClient();

  const [{ data: sessionData }, { data: entriesData, count }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("guestbook")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, 4),
  ]);

  const userEmail = sessionData.user?.email ?? null;
  const userId = sessionData.user?.id ?? null;

  // 카카오 로그인 사용자의 닉네임 추출
  const userMetadata = sessionData.user?.user_metadata;
  const userName =
    userMetadata?.full_name ??
    userMetadata?.name ??
    userMetadata?.preferred_username ??
    userEmail?.split('@')[0] ??
    null;

  const initialEntries = entriesData ?? [];
  const initialCount = count ?? initialEntries.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-24">
          <div className="space-y-8">
            <Guestbook
              initialEntries={initialEntries}
              userEmail={userEmail}
              userId={userId}
              userName={userName}
              initialCount={initialCount}
            />
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
