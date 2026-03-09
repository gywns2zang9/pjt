import { createClient } from "@/lib/supabase/server";
import HomeClient from "@/components/home-client";
import { SiteHeader } from "@/components/layout/site-header";
import { projects } from "@/lib/projects";

// 통계 수치는 60초 캐시 (매 요청마다 DB 조회 불필요)
export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();

  // 모든 DB 쿼리를 병렬로 실행
  const [
    { count: totalFeedbackCount },
    { count: visitorCount },
    { data: activeConfigs },
    userCount,
  ] = await Promise.all([
    // 의견 수
    supabase
      .from("guestbook")
      .select("*", { count: "exact", head: true }),

    // 총 방문 수
    supabase
      .from("page_views")
      .select("*", { count: "exact", head: true }),

    // 공개된 프로젝트 목록 (Works 페이지와 동일한 필터링 로직을 위해 id들을 가져옴)
    supabase
      .from("project_configs")
      .select("id")
      .eq("show_on_works", true),

    // 가입자 수
    (async () => {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
        return (listData as any)?.total ?? listData?.users?.length ?? 0;
      } else {
        const { data: uids } = await supabase
          .from("guestbook")
          .select("user_id")
          .not("user_id", "is", null);
        const uniqueUids = new Set((uids ?? []).map((r: any) => r.user_id));
        return uniqueUids.size;
      }
    })(),
  ]);

  // Works 페이지와 동일하게, DB에서 공개 설정되어 있으면서 실제 컴포넌트(projects)가 존재하는 것만 카운트
  const publicProjectCount = (activeConfigs ?? [])
    .filter(c => projects.some(p => p.id === c.id))
    .length;

  return (
    <>
      <SiteHeader />
      <HomeClient
        projectCount={publicProjectCount}
        totalFeedback={totalFeedbackCount ?? 0}
        userCount={userCount}
        visitorCount={visitorCount ?? 0}
      />
    </>
  );
}
