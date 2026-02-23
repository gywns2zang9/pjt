import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import {
    getProjectById,
    STATUS_STYLES,
    effectiveTitle,
    effectiveDescription,
    type ProjectStatus,
    type ProjectConfig,
} from "@/lib/projects";
import { ProjectRenderer } from "@/components/project-renderer";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function WorksProjectPage({ params }: Props) {
    const { id: slug } = await params;

    // 로그인 확인
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");

    // slug 또는 id로 공개된 프로젝트 검색
    const { data: configs } = await supabase
        .from("project_configs")
        .select("*")
        .eq("show_on_works", true);

    const dbConfig = configs?.find(
        (c) => (c.slug?.trim() || c.id) === slug
    );

    if (!dbConfig) notFound();

    const project = getProjectById(dbConfig.id);
    if (!project) notFound();

    const config: ProjectConfig = {
        id: dbConfig.id,
        status: dbConfig.status as ProjectStatus,
        show_on_works: true,
        title: dbConfig.title,
        description: dbConfig.description,
        slug: dbConfig.slug,
    };

    const statusStyle = STATUS_STYLES[config.status];
    const displayTitle = effectiveTitle(project, config);
    const displayDesc = effectiveDescription(config);

    const meta = user.user_metadata;
    const userName =
        meta?.full_name ?? meta?.name ?? meta?.preferred_username ?? user.email?.split("@")[0] ?? "익명";

    const isCompleted = config.status === "완성";

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-6">
                    <Link
                        href="/works"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← 목록으로
                    </Link>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">{displayTitle}</h1>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle.className}`}>
                                {statusStyle.label}
                            </span>
                        </div>
                        {displayDesc && <p className="text-muted-foreground text-sm">{displayDesc}</p>}
                    </div>

                    {isCompleted ? (
                        <ProjectRenderer id={dbConfig.id} userName={userName} gameConfig={dbConfig.game_config ?? undefined} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 bg-background border rounded-2xl border-dashed">
                            <div className="text-5xl mb-6 opacity-30">🚧</div>
                            <h2 className="text-xl font-semibold mb-2">접근 제한됨</h2>
                            <p className="text-muted-foreground text-center max-w-sm px-6">
                                현재 <span className="font-bold text-foreground">[{statusStyle.label}]</span> 상태인 프로젝트입니다.<br />
                                프로젝트가 <span className="font-bold text-emerald-500">완성</span>된 후에만 플레이할 수 있습니다.
                            </p>
                            <Link href="/works" className="mt-8 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all text-sm">
                                다른 프로젝트 탐색하기
                            </Link>
                        </div>
                    )}
                </Container>
            </main>
            <SiteFooter />
        </div>
    );
}
