import Link from "next/link";
import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { projects, STATUS_STYLES, effectiveTitle, effectiveDescription, effectiveSlug, type ProjectConfig } from "@/lib/projects";

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

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-8">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">뚝-딱!</h1>
                        <p className="text-muted-foreground">작업물을 모아둔 공간입니다.</p>
                    </div>

                    {visibleProjects.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground text-sm">
                            공개된 작업물이 없어요
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {visibleProjects.map(({ meta, config }) => {
                                const statusStyle = STATUS_STYLES[config.status];
                                const title = effectiveTitle(meta!, config);
                                const description = effectiveDescription(config);
                                const slug = effectiveSlug(meta!, config);
                                return (
                                    <Link
                                        key={meta!.id}
                                        href={`/works/${slug}`}
                                        className="group block rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1.5 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h2 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                                                        {title}
                                                    </h2>
                                                    <span
                                                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle.className}`}
                                                    >
                                                        {statusStyle.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                                    {description}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-muted-foreground/40 group-hover:text-primary/60 transition-colors mt-0.5">
                                                →
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </Container>
            </main>
            <SiteFooter />
        </div>
    );
}
