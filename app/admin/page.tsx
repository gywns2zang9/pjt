import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { projects, DEFAULT_CONFIG, type ProjectConfig } from "@/lib/projects";
import { ProjectAdminCard } from "@/components/labs/project-admin-card";

export default async function AdminPage() {
    const supabase = await createClient();

    const [
        { data: { user } },
        { data: configs },
    ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("project_configs").select("*"),
    ]);

    const projectsWithConfig = projects.map((p) => {
        const dbConfig = configs?.find((c: any) => c.id === p.id);
        const config: ProjectConfig = dbConfig
            ? {
                id: p.id,
                show_on_works: dbConfig.show_on_works,
                category: dbConfig.category || 'plays',
                sort_order: dbConfig.sort_order ?? 0,
                title: dbConfig.title,
                description: dbConfig.description,
                slug: dbConfig.slug,
            }
            : { id: p.id, ...DEFAULT_CONFIG };
        return { meta: p, config };
    }).sort((a, b) => (a.config.sort_order ?? 0) - (b.config.sort_order ?? 0));

    const playsProjects = projectsWithConfig.filter(p => p.config.category === 'plays');
    const partyProjects = projectsWithConfig.filter(p => p.config.category === 'party');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-12">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black tracking-tight uppercase">관리자 페이지</h1>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-widest">
                                Admin
                            </span>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">
                            콘텐츠의 노출 위치와 순서를 관리합니다.
                        </p>
                    </div>

                    <div className="space-y-10">
                        {/* 1. 혼자 뚝딱 */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-4 py-1">
                                <h2 className="text-xl font-bold tracking-tight">혼자 뚝딱 <span className="text-emerald-500 font-black">Plays</span></h2>
                                <span className="text-xs font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{playsProjects.length}</span>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {playsProjects.map(({ meta, config }) => (
                                    <ProjectAdminCard key={meta.id} project={meta} config={config} />
                                ))}
                            </div>
                        </section>

                        {/* 2. 같이 뚝딱 */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 border-l-4 border-indigo-500 pl-4 py-1">
                                <h2 className="text-xl font-bold tracking-tight">같이 뚝딱 <span className="text-indigo-500 font-black">Party</span></h2>
                                <span className="text-xs font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{partyProjects.length}</span>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {partyProjects.map(({ meta, config }) => (
                                    <ProjectAdminCard key={meta.id} project={meta} config={config} />
                                ))}
                            </div>
                        </section>
                    </div>
                </Container>
            </main>
            <SiteFooter />
        </div>
    );
}
