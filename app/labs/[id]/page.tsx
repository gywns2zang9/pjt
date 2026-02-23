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
import { type GameConfig } from "@/components/games/chosung-game";

const DEFAULT_GAME_CONFIG: GameConfig = {
    gameDuration: 5,
    breakDuration: 1500,
    numConsonants: 2,
};

// 게임 설정 섹션이 있는 프로젝트
const GAME_PROJECT_IDS = ["chosung-game"];

interface Props {
    params: Promise<{ id: string }>;
}

export default async function LabProjectSettingsPage({ params }: Props) {
    const { id } = await params;
    const project = getProjectById(id);
    if (!project) notFound();

    // 관리자 인증
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");
    if (!checkIsAdmin(user.id)) redirect("/");

    // DB 설정 가져오기
    const { data: dbConfig } = await supabase
        .from("project_configs")
        .select("*")
        .eq("id", id)
        .single();

    const config: ProjectConfig = dbConfig
        ? {
            id,
            status: dbConfig.status,
            show_on_works: dbConfig.show_on_works,
            title: dbConfig.title,
            description: dbConfig.description,
            slug: dbConfig.slug,
        }
        : { id, ...DEFAULT_CONFIG };

    const gameConfig: GameConfig = dbConfig?.game_config
        ? { ...DEFAULT_GAME_CONFIG, ...dbConfig.game_config }
        : DEFAULT_GAME_CONFIG;

    const displayTitle = effectiveTitle(project, config);
    const hasGameConfig = GAME_PROJECT_IDS.includes(id);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-6">
                    {/* 헤더 */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/labs"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ← 관리 패널
                        </Link>
                        <span className="text-muted-foreground/40">/</span>
                        <span className="text-sm font-medium text-foreground">{displayTitle}</span>
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">{displayTitle} 설정</h1>
                        <p className="text-sm text-muted-foreground">
                            프로젝트 정보와 게임 설정을 관리합니다.
                        </p>
                    </div>

                    <ProjectSettings
                        project={project}
                        config={config}
                        initialGameConfig={gameConfig}
                        hasGameConfig={hasGameConfig}
                    />
                </Container>
            </main>
            <SiteFooter />
        </div>
    );
}
