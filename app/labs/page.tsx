import { redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/admin";
import { projects, DEFAULT_CONFIG, type ProjectConfig } from "@/lib/projects";
import { ProjectAdminCard } from "@/components/labs/project-admin-card";

export default async function LabPage() {
    // 관리자 인증
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");
    if (!checkIsAdmin(user.id)) redirect("/");

    // DB에서 설정 가져오기
    const { data: configs } = await supabase
        .from("project_configs")
        .select("*");

    // 정적 프로젝트 목록과 DB 설정 병합
    const projectsWithConfig = projects.map((p) => {
        const dbConfig = configs?.find((c) => c.id === p.id);
        const config: ProjectConfig = dbConfig
            ? {
                id: p.id,
                status: dbConfig.status,
                show_on_works: dbConfig.show_on_works,
                title: dbConfig.title,
                description: dbConfig.description,
                slug: dbConfig.slug,
            }
            : { id: p.id, ...DEFAULT_CONFIG };
        return { meta: p, config };
    });

    const worksCount = projectsWithConfig.filter((p) => p.config.show_on_works).length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-8">
                    {/* 헤더 */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">관리 패널</h1>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                                관리자
                            </span>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            프로젝트를 관리합니다.
                        </p>
                    </div>

                    {/* 프로젝트 카드 목록 */}
                    {projects.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground text-sm">
                            등록된 프로젝트가 없습니다
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {projectsWithConfig.map(({ meta, config }) => (
                                <ProjectAdminCard key={meta.id} project={meta} config={config} />
                            ))}
                        </div>
                    )}
                </Container>
            </main>
            <SiteFooter />
        </div>
    );
}
