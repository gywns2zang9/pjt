import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { projects, type ProjectConfig, getProjectById, effectiveTitle } from "@/lib/projects";
import { ProjectRegistry } from "@/components/project-registry";
import { Guestbook } from "@/components/guestbook";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function PartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. 프로젝트 설정 조회
    const { data: config } = await supabase
        .from("project_configs")
        .select("*")
        .eq("id", id)
        .single();

    // 2. 유저 정보 (Guestbook용)
    const { data: { user } } = await supabase.auth.getUser();

    const meta = projects.find((p) => p.id === id);
    if (!meta) return <div>Project not found</div>;

    const projectConfig: ProjectConfig = config || { id, show_on_works: true, category: 'party' };
    const displayTitle = effectiveTitle(meta, projectConfig);

    const userMeta = user?.user_metadata;
    const userName = user
        ? (userMeta?.full_name ?? userMeta?.name ?? userMeta?.preferred_username ?? user.email?.split("@")[0] ?? "익명")
        : "비회원";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground">
            <SiteHeader />
            <main className="flex-1">
                <div className="bg-white dark:bg-slate-900 border-b border-border/50 sticky top-14 z-20">
                    <Container className="py-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/party"
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Link>
                            <h1 className="text-lg font-bold truncate">{displayTitle}</h1>
                        </div>
                    </Container>
                </div>

                <Container className="py-8">
                    <ProjectRegistry id={id} userName={userName} />
                </Container>

                <div className="border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/30 py-16">
                    <Container>
                        <Guestbook
                            projectId={id}
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

export async function generateStaticParams() {
    return projects.map((project) => ({
        id: project.id,
    }));
}
