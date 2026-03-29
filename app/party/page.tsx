import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { projects, type ProjectConfig, type ProjectMeta } from "@/lib/projects";
import { Guestbook } from "@/components/guestbook";
import ProjectListClient from "@/components/project-list-client";

export default async function PartyPage() {
    const supabase = await createClient();

    // 1. 모든 공개 프로젝트 설정 조회
    const { data: configs } = await supabase.from("project_configs")
        .select("*")
        .eq("show_on_works", true);

    // 2. 유저 정보
    const { data: { user } } = await supabase.auth.getUser();

    // 정적 메타와 매핑 및 category 필터링
    const initialProjects = (configs ?? [])
        .map((c: any) => ({
            config: { ...c, category: c.category || 'plays' } as ProjectConfig,
            meta: projects.find((p) => p.id === c.id),
        }))
        .filter((p) => p.meta && p.config.category === 'party') as { config: ProjectConfig; meta: ProjectMeta }[];

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
                        <h4 className="text-2xl font-semibold tracking-tight">함께 즐겨주세요~^^</h4>
                    </div>

                    <ProjectListClient initialProjects={initialProjects} baseUrl="/party" />
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
