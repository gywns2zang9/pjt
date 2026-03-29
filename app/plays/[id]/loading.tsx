import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/layout/container";

/**
 * /plays/[id] 전용 로딩 스켈레톤
 * 게임 페이지와 동일한 레이아웃을 유지합니다.
 */
export default function GameLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-6">
                    {/* 뒤로가기 링크 스켈레톤 */}
                    <div className="w-20 h-4 bg-muted rounded animate-pulse" />

                    {/* 제목 스켈레톤 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-40 h-7 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="w-64 h-4 bg-muted/60 rounded animate-pulse" />
                    </div>

                    {/* 게임 영역 스켈레톤 */}
                    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
                        {/* 메인 게임 영역 */}
                        <div className="lg:flex-1 min-w-0">
                            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                                <div className="w-full aspect-[3/2] max-h-[400px] bg-muted/50 rounded-xl animate-pulse" />
                                <div className="w-full h-12 bg-muted/40 rounded-lg animate-pulse" />
                            </div>
                        </div>

                        {/* 사이드바 */}
                        <div className="lg:w-64 shrink-0 flex flex-col gap-4">
                            {/* HTP 스켈레톤 */}
                            <div className="p-4 rounded-2xl border border-border bg-card/50">
                                <div className="w-28 h-4 bg-muted rounded animate-pulse" />
                            </div>
                            {/* 랭킹 스켈레톤 */}
                            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-muted rounded animate-pulse" />
                                    <div className="w-12 h-4 bg-muted rounded animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30">
                                            <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
                                            <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
                                            <div className="w-10 h-4 bg-muted rounded animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </main>
        </div>
    );
}
