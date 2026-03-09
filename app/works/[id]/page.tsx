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
import { Guestbook } from "@/components/guestbook";
import { AlertTriangle } from "lucide-react";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function WorksProjectPage({ params }: Props) {
    const { id: slug } = await params;

    // 로그인 확인
    const supabase = await createClient();
    // const {
    //     data: { user },
    // } = await supabase.auth.getUser();

    // if (!user) redirect("/auth/login");

    // 세션 가져오기 (인증 여부 상관없이 진행)
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    // slug 또는 id로 공개된 프로젝트 검색
    const { data: configs } = await supabase
        .from("project_configs")
        .select("*")
        .eq("show_on_works", true);

    const dbConfig = configs?.find(
        (c) => (c.slug?.trim() || c.id) === slug
    );

    if (!dbConfig) notFound();

    const { data: entriesData, count: entriesCount } = await supabase
        .from("guestbook")
        .select("*", { count: "exact" })
        .eq("project_id", dbConfig.id)
        .order("created_at", { ascending: false })
        .range(0, 4);

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

    const meta = user?.user_metadata;
    const userName = user
        ? (meta?.full_name ?? meta?.name ?? meta?.preferred_username ?? user.email?.split("@")[0] ?? "익명")
        : "비회원";

    const isCompleted = config.status === "완성";

    // 로그인 안내 배너 표시 조건 (게임류만 표시)
    const showLoginBanner = !user && ["chosung-game", "circle-game", "speed-game", "size-game", "ddong-game"].includes(dbConfig.id);

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

                    {showLoginBanner && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                                    기록이 날아가요. 로그인해 주세요.
                                </p>
                            </div>
                            <Link
                                href="/auth/login"
                                className="shrink-0 text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-amber-600 transition-all shadow-sm shadow-amber-500/20"
                            >
                                로그인
                            </Link>
                        </div>
                    )}

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
                        <>
                            <ProjectRenderer id={dbConfig.id} userName={userName} gameConfig={dbConfig.game_config ?? undefined} />

                            <div className="pt-16 mt-16 border-t border-border/50">
                                <Guestbook
                                    projectId={dbConfig.id}
                                    initialEntries={entriesData ?? []}
                                    userEmail={user?.email ?? null}
                                    userId={user?.id ?? null}
                                    userName={userName}
                                    initialCount={entriesCount ?? (entriesData?.length ?? 0)}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 bg-background border rounded-2xl border-dashed">
                            <div className="text-5xl mb-6 opacity-30">🚧</div>
                            <h2 className="text-xl font-semibold mb-2">제한됨</h2>
                            <p className="text-muted-foreground text-center max-w-sm px-6">
                                현재 <span className="font-bold text-foreground">[{statusStyle.label}]</span>인 프로젝트입니다.<br />
                            </p>
                            <Link href="/works" className="mt-8 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all text-sm">
                                다른 프로젝트 보기
                            </Link>
                        </div>
                    )}
                </Container>
            </main>
            <SiteFooter />
        </div>
    );
}
