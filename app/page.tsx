import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import HomeClient from "@/components/home-client";
import { SiteHeader } from "@/components/layout/site-header";
import { projects } from "@/lib/projects";

export default async function Home() {
  noStore();
  const supabase = await createClient();

  const { count: totalFeedbackCount } = await supabase
    .from("guestbook")
    .select("*", { count: "exact", head: true });

  const totalFeedback = totalFeedbackCount ?? 0;
  const projectCount = projects.length;

  // 가입자 수: service_role 키 있으면 정확한 수 조회, 없으면 guestbook unique user_id로 근사
  let userCount = 0;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userCount = (listData as any)?.total ?? listData?.users?.length ?? 0;
  } else {
    const { data: uids } = await supabase
      .from("guestbook")
      .select("user_id")
      .not("user_id", "is", null);
    const uniqueUids = new Set((uids ?? []).map((r: any) => r.user_id));
    userCount = uniqueUids.size;
  }

  // 총 방문 횟수 (page_views 테이블)
  const { count: visitorCount } = await supabase
    .from("page_views")
    .select("*", { count: "exact", head: true });

  return (
    <>
      <SiteHeader />
      <HomeClient
        projectCount={projectCount}
        totalFeedback={totalFeedback}
        userCount={userCount}
        visitorCount={visitorCount ?? 0}
      />
    </>
  );
}
