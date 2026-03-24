import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { projects, type ProjectConfig, type ProjectMeta } from "@/lib/projects";
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

    // 1. 최소한의 프로젝트 설정만 조회 (매우 빠름)
    const { data: configs } = await supabase.from("project_configs")
        .select("*")
        .eq("show_on_works", true);

    // 2. 유저 정보 (세션 확인 - 필수)
    const { data: { user } } = await supabase.auth.getUser();

    // 정적 메타와 매핑 (서버에서 구조는 잡아줌)
    const initialProjects = (configs ?? [])
        .map((c: ProjectConfig) => ({
            config: c,
            meta: projects.find((p) => p.id === c.id),
        }))
        .filter((p) => p.meta) as { config: ProjectConfig; meta: ProjectMeta }[];

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
                        <p className="text-muted-foreground">재밌게 즐겨주세요~^^</p>
                    </div>

                    <ProjectListClient initialProjects={initialProjects} />
                </Container>

                <div className="border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/30 py-16">
                    <Container>
                        <Guestbook
                            projectId="home"
                            initialEntries={[]}
                            userEmail={user?.email ?? null}
                            userId={user?.id ?? null}
                            userName={userName}
                            initialCount={0}
                        />
                    </Container>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
