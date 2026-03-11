import Link from "next/link";
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
};

// 시간 기반(낮을수록 좋은) 게임
const SCORE_ASC = new Set(["speed-game", "sort-game", "touch-game"]);

export default async function WorksPage() {
    const supabase = await createClient();

    // Works에 공개된 프로젝트만 가져오기
    const { data: configs } = await supabase
        .from("project_configs")
        .select("*")
        .eq("show_on_works", true);

    // 정적 메타와 매핑
    const visibleProjects = (configs ?? [])
        .map((c: ProjectConfig) => ({
            config: c,
            meta: projects.find((p) => p.id === c.id),
        }))
        .filter((p) => p.meta);

    // 방명록 및 유저 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();

    // ── 통계(전체/나의 플레이 + 순위) 비동기 조회 ──
    const projectsWithStats = await Promise.all(
        visibleProjects.map(async (project) => {
            const id = project.meta!.id;
            const tableName = TABLE_MAP[id];
            let totalPlay = 0;
            let myPlay = 0;
            let myRank: number | null = null;
            let totalPlayers = 0;

            if (tableName) {
                // 전체 스코어 데이터 조회 (play_count + score + user_id)
                const { data: allData } = await supabase
                    .from(tableName)
                    .select("user_id, score, play_count");

                const rows = allData ?? [];
                totalPlayers = rows.length;
                totalPlay = rows.reduce((acc: number, row: any) => acc + (row.play_count ?? 0), 0);

                if (user) {
                    // 내 플레이 횟수
                    const myRow = rows.find((r: any) => r.user_id === user.id);
                    if (myRow) {
                        myPlay = myRow.play_count ?? 0;
                        const myScore = myRow.score ?? 0;

                        // 순위 계산 (동점자는 같은 등수)
                        const isAsc = SCORE_ASC.has(id);
                        const betterCount = rows.filter((r: any) =>
                            isAsc
                                ? (r.score ?? Infinity) < myScore  // 시간 기반: 나보다 빠른 사람
                                : (r.score ?? 0) > myScore         // 점수 기반: 나보다 높은 사람
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
        })
    );

    const { data: entriesData, count: entriesCount } = await supabase
        .from("guestbook")
        .select("*", { count: "exact" })
        .eq("project_id", "home")
        .order("created_at", { ascending: false })
        .range(0, 4);

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
