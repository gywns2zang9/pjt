import { createClient } from "@/lib/supabase/server";
import HomeClient from "@/components/home-client";
import { SiteHeader } from "@/components/layout/site-header";

// ISR: 60초 동안 캐시 → DB 부하 없이 즉시 응답
export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();

  const [
    { count: visitorCount },
    ...playCountResults
  ] = await Promise.all([
    supabase.from("page_views").select("*", { count: "exact", head: true }),
    // 각 게임 테이블의 play_count 합산을 위해 play_count 컬럼만 조회
    supabase.from("chosung_scores").select("play_count"),
    supabase.from("circle_scores").select("play_count"),
    supabase.from("ddong_scores").select("play_count"),
    supabase.from("size_scores").select("play_count"),
    supabase.from("sort_scores").select("play_count"),
    supabase.from("speed_scores").select("play_count"),
  ]);

  const userCountResult = await (async () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (key) {
      const { createClient: c } = await import("@supabase/supabase-js");
      const admin = c(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
      return (data as any)?.total ?? data?.users?.length ?? 0;
    }
    return 0;
  })();

  // 모든 게임 테이블의 play_count 합산
  const totalPlayCount = (playCountResults as any[]).reduce((sum, result) => {
    const rows = result.data ?? [];
    return sum + rows.reduce((s: number, r: any) => s + (r.play_count ?? 0), 0);
  }, 0);

  return (
    <>
      <SiteHeader />
      <HomeClient
        visitorCount={visitorCount ?? 0}
        playCount={totalPlayCount}
        userCount={userCountResult}
      />
    </>
  );
}
