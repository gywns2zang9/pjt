import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { projects, effectiveTitle, effectiveDescription, effectiveSlug, type ProjectConfig } from "@/lib/projects";
import { Guestbook } from "@/components/guestbook";
import ProjectListClient from "@/components/project-list-client";

const TABLE_MAP: Record<string, string> = {
    "chosung-game": "chosung_scores",
    "circle-game": "circle_scores",
    "size-game": "size_scores",
    "speed-game": "speed_scores",
    "sort-game": "sort_scores",
    "ddong-game": "ddong_scores",
    "touch-game": "touch_scores",
    "eyes-game": "eyes_scores",
    "arrow-game": "arrow_scores",
    "balloon-game": "balloon_scores",
    "bug-game": "bug_scores",
};

// 시간 기반(낮을수록 좋은) 게임
const SCORE_ASC = new Set(["speed-game", "sort-game", "touch-game"]);

// 모든 고유 테이블 이름 추출 (한 번에 병렬 조회하기 위해)
const ALL_SCORE_TABLES = [...new Set(Object.values(TABLE_MAP))];

export default async function WorksPage() {
    const supabase = await createClient();

    // 1. 유저 ID가 필요 없는 쿼리는 먼저 Promise로 실행 (워터폴 방지)
    const configsPromise = supabase.from("project_configs").select("*").eq("show_on_works", true);
    const guestbookPromise = supabase.from("guestbook").select("*", { count: "exact" })
        .eq("project_id", "home")
        .order("created_at", { ascending: false })
        .range(0, 4);

    // 2. 유저 인증 병렬 대기
    const { data: { user } } = await supabase.auth.getUser();

    // 3. RPC로 넘길 모든 게임 테이블 목록 구성
    const tablesPayload = Object.keys(TABLE_MAP).map(key => ({
        id: key,
        table: TABLE_MAP[key],
        isAsc: SCORE_ASC.has(key)
    }));

    // 4. 유저 ID가 필요한 통계 쿼리 실행
    const statsPromise = supabase.rpc("get_all_game_stats", {
        p_tables: tablesPayload,
        p_user_id: user?.id ?? null
    });

    // 5. 모든 비동기 작업 결과 병합 대기
    const [
        { data: configs },
        guestbookResult,
        { data: statsData }
    ] = await Promise.all([
        configsPromise,
        guestbookPromise,
        statsPromise
    ]);

    const entriesData = guestbookResult.data;
    const entriesCount = guestbookResult.count;

    // 정적 메타와 매핑
    const visibleProjects = (configs ?? [])
        .map((c: ProjectConfig) => ({
            config: c,
            meta: projects.find((p) => p.id === c.id),
        }))
        .filter((p) => p.meta);

    // RPC 결과와 매핑
    const projectsWithStats = visibleProjects.map((project) => {
        const stat = (statsData as any[])?.find(s => s.id === project.meta!.id);
        return {
            config: project.config,
            meta: { id: project.meta!.id, title: project.meta!.title },
            totalPlay: stat?.totalPlay ?? 0,
            myPlay: stat?.myPlay ?? 0,
            myRank: stat?.myRank ?? null,
            totalPlayers: stat?.totalPlayers ?? 0,
        };
    });

    // 방명록 데이터는 위의 Promise.all에서 이미 조회 완료

    const meta = user?.user_metadata;
    const userName = user
        ? (meta?.full_name ?? meta?.name ?? meta?.preferred_username ?? user.email?.split("@")[0] ?? "익명")
        : "비회원";

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-8">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">뚝-딱!</h1>
                        <p className="text-muted-foreground">재미로 즐겨주세요~^^</p>
                    </div>

                    <ProjectListClient projects={projectsWithStats} />
                </Container>

                <div className="border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/30 py-16">
                    <Container>
                        <Guestbook
                            projectId="home"
                            initialEntries={entriesData ?? []}
                            userEmail={user?.email ?? null}
                            userId={user?.id ?? null}
                            userName={userName}
                            initialCount={entriesCount ?? 0}
                        />
                    </Container>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
