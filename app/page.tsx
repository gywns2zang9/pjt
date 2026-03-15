import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import HomeClient from "@/components/home-client";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * ISR (Incremental Static Regeneration) 설정
 * 5분(300초) 주기로 페이지를 백그라운드에서 최신화합니다.
 */
export const revalidate = 300;

/**
 * 전역 통계 데이터를 가져와 캐싱하는 함수
 * DB 부하를 줄이기 위해 Next.js의 메모리 캐싱(unstable_cache)을 사용합니다.
 */
const getCachedStats = unstable_cache(
  async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    /**
     * 캐시 효율을 높이기 위해 쿠키/인증 정보에 의존하지 않는 별도의 클라이언트를 생성합니다.
     * 이렇게 하면 모든 사용자에게 동일한 최적화된 캐시 데이터를 줄 수 있습니다.
     */
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const tables = [
      "chosung_scores",
      "circle_scores",
      "ddong_scores",
      "eyes_scores",
      "size_scores",
      "sort_scores",
      "speed_scores",
      "touch_scores",
    ];

    /**
     * 모든 DB 조회를 병렬(Parallel)로 실행하여 전체 로딩 시간을 단축합니다.
     */
    const [visitorResult, ...results] = await Promise.all([
      // 1. 전체 방문자 수 조회
      supabase.from("page_views").select("*", { count: "exact", head: true }),
      // 2. 각 게임별 플레이 횟수 데이터 조회
      ...tables.map((table) => supabase.from(table).select("play_count")),
      // 3. 전체 가입 사용자 수 조회 (Service Role 필요)
      (async () => {
        if (!serviceRoleKey) return 0;
        const admin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        // 실제 유저 목록이 아닌 숫자(count) 정보만 가져와 효율화
        const { data } = await admin.auth.admin.listUsers({ perPage: 1 });
        return (data as any)?.total ?? (data as any)?.users?.length ?? 0;
      })(),
    ]);

    // 배열의 마지막에 넣었던 userCount 추출
    const userCount = results.pop() as number;
    const playCountResults = results;

    const visitorCount = visitorResult.count ?? 0;

    /**
     * 각 테이블에 흩어져 있는 play_count 실시간 합산
     */
    const totalPlayCount = playCountResults.reduce((sum, result: any) => {
      const rows = result.data ?? [];
      return sum + rows.reduce((s: number, r: any) => s + (r.play_count ?? 0), 0);
    }, 0);

    return { visitorCount, totalPlayCount, userCount };
  },
  ["home-stats"], // 캐시 키
  { revalidate: 300, tags: ["stats"] }
);

export default async function Home() {
  /**
   * 캐시된 통계 데이터를 가져옵니다. 
   * 이미 생성된 데이터가 있다면 즉시 반환되며, 5분이 지나면 백그라운드에서 갱신됩니다.
   */
  const { visitorCount, totalPlayCount, userCount } = await getCachedStats();

  return (
    <>
      {/**
        * SiteHeader 내의 Auth 정보 확인(쿠키 기반)으로 인해 화면 전체 로딩이 멈추지 않도록
        * Suspense 바운더리를 설정하여 메인 콘텐츠가 먼저 보이게 처리합니다.
        */}
      <Suspense fallback={<div className="h-16 border-b border-border/80 bg-background/80 backdrop-blur" />}>
        <SiteHeader />
      </Suspense>
      <HomeClient
        visitorCount={visitorCount}
        playCount={totalPlayCount}
        userCount={userCount}
      />
    </>
  );
}
