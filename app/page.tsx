import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import HomeClient, { Counter } from "@/components/home-client";
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

    /**
     * DB 테이블 리스트. 각 게임의 점수 테이블에서 플레이 횟수를 집계합니다.
     */
    const tables = [
      "chosung_scores",
      "circle_scores",
      "ddong_scores",
      "eyes_scores",
      "size_scores",
      "sort_scores",
      "speed_scores",
      "touch_scores",
      "arrow_scores",
      "balloon_scores",
    ];

    const tablesPayload = tables.map((t) => ({ id: t, table: t, isAsc: false }));

    const [visitorResult, statsResult, userCount] = await Promise.all([
      // 1. 전체 방문자 수 조회
      supabase.from("page_views").select("*", { count: "exact", head: true }),
      // 2. 각 게임별 플레이 횟수 데이터 집계 (RPC로 한번에 고속 조회)
      supabase.rpc("get_all_game_stats", { p_tables: tablesPayload }),
      // 3. 전체 가입 사용자 수 조회 (Service Role 필요)
      (async () => {
        if (!serviceRoleKey) return 0;
        const admin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data } = await admin.auth.admin.listUsers({ perPage: 1 });
        return (data as any)?.total ?? (data as any)?.users?.length ?? 0;
      })(),
    ]);

    const visitorCount = visitorResult.count ?? 0;

    // RPC에서 받아온 각 게임별 totalPlay를 합산
    const totalPlayCount = (statsResult.data as any[])?.reduce(
      (sum, item) => sum + (item.totalPlay ?? 0),
      0
    ) ?? 0;

    return { visitorCount, totalPlayCount, userCount };
  },
  ["home-stats"],
  { revalidate: 300, tags: ["stats"] }
);

/**
 * 통계 숫자 영역만 담당하는 서버 컴포넌트
 */
async function HomeStatsServer() {
  const { visitorCount, totalPlayCount, userCount } = await getCachedStats();
  return (
    <div className="grid grid-cols-3 gap-8 md:gap-16">
      <StatItem label="총 방문" value={visitorCount} />
      <StatItem label="플레이" value={totalPlayCount} />
      <StatItem label="친구들" value={userCount} />
    </div>
  );
}

/**
 * 통계 로딩 중에 보여줄 스켈레톤 UI
 */
function HomeStatsFallback() {
  return (
    <div className="grid grid-cols-3 gap-8 md:gap-16">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          {/* stats placeholder: root loading.tsx와 동일한 크기 */}
          <div className="w-12 h-8 md:w-20 md:h-10 bg-slate-800/50 rounded animate-pulse" />
          <div className="w-10 h-3 bg-slate-800/30 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * 범용 통계 아이템 컴포넌트 (HomeClient에서 사용하기 위해 export)
 */
export function StatItem({ label, value, isFallback }: { label: string; value: number; isFallback?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl md:text-5xl font-black text-white italic tabular-nums min-w-[2ch]">
        <Counter value={value} isLoaded={!isFallback} />
      </span>
      <span className="mt-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
        {label}
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />

      <HomeClient>
        <Suspense fallback={<HomeStatsFallback />}>
          <HomeStatsServer />
        </Suspense>
      </HomeClient>
    </>
  );
}
