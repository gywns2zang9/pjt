import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/admin";
import {
    getProjectById,
    DEFAULT_CONFIG,
    effectiveTitle,
    type ProjectConfig,
} from "@/lib/projects";
import { ProjectSettings } from "@/components/labs/project-settings";

const RANKING_PROJECT_IDS = [
    "chosung-game",
    "circle-game",
    "speed-game",
    "ddong-game",
    "sort-game",
    "touch-game",
    "eyes-game",
    "arrow-game",
    "size-game",
    "balloon-game",
    "bug-game"
];

interface Props {
    params: Promise<{ id: string }>;
}

export default async function AdminProjectSettingsPage({ params }: Props) {
    const { id } = await params;
    const project = getProjectById(id);
    if (!project) notFound();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");
    if (!checkIsAdmin(user.id)) redirect("/");

    const { data: dbConfig } = await supabase
        .from("project_configs")
        .select("*")
        .eq("id", id)
        .single();

    const config: ProjectConfig = dbConfig
        ? {
            id,
            show_on_works: dbConfig.show_on_works,
            category: dbConfig.category || 'plays',
            sort_order: dbConfig.sort_order ?? 0,
            title: dbConfig.title,
            description: dbConfig.description,
            slug: dbConfig.slug,
        }
        : { id, ...DEFAULT_CONFIG };

    const displayTitle = effectiveTitle(project, config);
    const hasRanking = RANKING_PROJECT_IDS.includes(id);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-8">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 p-2 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all shadow-sm"
                            title="목록으로"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m15 18-6-6 6-6"/>
                            </svg>
                        </Link>
                        <div className="space-y-0.5">
                            <h1 className="text-xl font-bold tracking-tight">{displayTitle} 설정</h1>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Project Configuration</p>
                        </div>
                    </div>

                    <ProjectSettings
                        project={project}
                        config={config}
                        hasRanking={hasRanking}
                    />
                </Container>
            </main>
            <SiteFooter />
        </div>
    );
}
