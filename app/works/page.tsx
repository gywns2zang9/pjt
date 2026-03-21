import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { projects, STATUS_STYLES, effectiveTitle, effectiveDescription, effectiveSlug, type ProjectConfig } from "@/lib/projects";
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
};

// 시간 기반(낮을수록 좋은) 게임
const SCORE_ASC = new Set(["speed-game", "sort-game", "touch-game"]);

// 모든 고유 테이블 이름 추출 (한 번에 병렬 조회하기 위해)
const ALL_SCORE_TABLES = [...new Set(Object.values(TABLE_MAP))];

export default async function WorksPage() {
    const supabase = await createClient();

    // ============================================
    // 🔥 핵심 개선: 모든 DB 쿼리를 동시에 병렬 실행
    // 기존: auth → configs → 9테이블 → guestbook (직렬)
    // 개선: 모든 쿼리를 한 번에 Promise.all
    // ============================================
    const [
        { data: { user } },
        { data: configs },
        guestbookResult,
        ...scoreResults
    ] = await Promise.all([
        // 1. 유저 인증 (병렬)
        supabase.auth.getUser(),
        // 2. 공개 프로젝트 설정 (병렬)
        supabase.from("project_configs").select("*").eq("show_on_works", true),
        // 3. 방명록 (병렬)
        supabase.from("guestbook").select("*", { count: "exact" })
            .eq("project_id", "home")
            .order("created_at", { ascending: false })
            .range(0, 4),
        // 4. 모든 게임 점수 테이블 한번에 (병렬)
        ...ALL_SCORE_TABLES.map((table) =>
            supabase.from(table).select("user_id, score, play_count")
        ),
    ]);

    const entriesData = guestbookResult.data;
    const entriesCount = guestbookResult.count;

    // 테이블 이름 → 데이터 매핑
    const scoreDataMap = new Map<string, any[]>();
    ALL_SCORE_TABLES.forEach((table, i) => {
        scoreDataMap.set(table, scoreResults[i]?.data ?? []);
    });

    // 정적 메타와 매핑
    const visibleProjects = (configs ?? [])
        .map((c: ProjectConfig) => ({
            config: c,
            meta: projects.find((p) => p.id === c.id),
        }))
        .filter((p) => p.meta);

    // 이미 조회된 데이터에서 통계 계산 (추가 DB 호출 없음)
    const projectsWithStats = visibleProjects.map((project) => {
        const id = project.meta!.id;
        const tableName = TABLE_MAP[id];
        let totalPlay = 0;
        let myPlay = 0;
        let myRank: number | null = null;
        let totalPlayers = 0;

        if (tableName) {
            const rows = scoreDataMap.get(tableName) ?? [];
            totalPlayers = rows.length;
            totalPlay = rows.reduce((acc: number, row: any) => acc + (row.play_count ?? 0), 0);

            if (user) {
                const myRow = rows.find((r: any) => r.user_id === user.id);
                if (myRow) {
                    myPlay = myRow.play_count ?? 0;
                    const myScore = myRow.score ?? 0;
                    const isAsc = SCORE_ASC.has(id);
                    const betterCount = rows.filter((r: any) =>
                        isAsc
                            ? (r.score ?? Infinity) < myScore
                            : (r.score ?? 0) > myScore
                    ).length;
                    myRank = betterCount + 1;
                }
            }
        }

        return {
            config: project.config,
            meta: { id: project.meta!.id, title: project.meta!.title },
            totalPlay,
            myPlay,
            myRank,
            totalPlayers,
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
