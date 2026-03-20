import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/layout/container";

/**
 * /labs 관리 패널 로딩 스켈레톤
 * 
 * 실제 페이지(app/labs/page.tsx)와 동일한 레이아웃을 사용합니다.
 */
export default function LabsLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-8">
                    {/* 관리 패널 헤더 */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="w-32 h-8 bg-muted rounded animate-pulse" />
                            <div className="w-12 h-5 bg-primary/10 border border-primary/20 rounded-full animate-pulse" />
                        </div>
                        <div className="w-40 h-4 bg-muted/40 rounded animate-pulse" />
                    </div>

                    {/* 프로젝트 카드 그리드 */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-24 h-5 bg-muted rounded animate-pulse" />
                                    <div className="w-10 h-10 bg-muted/30 rounded-lg animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    <div className="w-full h-4 bg-muted/40 rounded animate-pulse" />
                                    <div className="w-3/4 h-4 bg-muted/20 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Container>
            </main>
        </div>
    );
}
