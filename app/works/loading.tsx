import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/layout/container";

/**
 * /works 페이지 로딩 스켈레톤
 *
 * 실제 페이지(page.tsx)와 동일한 레이아웃을 사용합니다:
 * - SiteHeader (실제 컴포넌트 — 즉시 렌더)
 * - 타이틀 "뚝-딱!" + 서브텍스트
 * - "총 N개의 콘텐츠" + 정렬 드롭다운
 * - 프로젝트 카드 그리드 (sm:grid-cols-2)
 * - 방명록 영역
 */
export default function WorksLoading() {
    // 실제 카드 개수에 근사한 스켈레톤 (9개)
    const CARD_COUNT = 9;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-8">
                    {/* 타이틀 — 실제 텍스트 사용 (로딩과 무관하게 동일) */}
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">뚝-딱!</h1>
                        <p className="text-muted-foreground">재미로 즐겨주세요~^^</p>
                    </div>

                    {/* ProjectListClient 스켈레톤 */}
                    <div className="space-y-6">
                        {/* 상단: "총 N개의 콘텐츠" + 정렬 드롭다운 */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-md w-fit">
                                <div className="w-28 h-4 bg-muted/50 rounded animate-pulse" />
                            </div>
                            <div className="w-full sm:w-32 h-9 sm:h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
                        </div>

                        {/* 카드 그리드 — 실제와 동일한 grid gap-3 sm:grid-cols-2 */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            {Array.from({ length: CARD_COUNT }, (_, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl border border-border bg-card p-5"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            {/* 타이틀 + 상태 뱃지 */}
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-5 bg-muted rounded animate-pulse" />
                                                <div className="w-10 h-4 bg-emerald-400/15 border border-emerald-400/30 rounded-full animate-pulse" />
                                            </div>
                                            {/* 설명 */}
                                            <div className="space-y-1 pt-0.5">
                                                <div className="w-full h-3.5 bg-muted/40 rounded animate-pulse" />
                                                <div className="w-3/5 h-3.5 bg-muted/25 rounded animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Container>

                {/* 방명록 영역 스켈레톤 */}
                <div className="border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/30 py-16">
                    <Container>
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-6 bg-muted rounded animate-pulse" />
                                <div className="w-8 h-5 bg-muted/50 rounded-full animate-pulse" />
                            </div>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-14 h-3 bg-muted/60 rounded animate-pulse" />
                                            <div className="w-20 h-3 bg-muted/30 rounded animate-pulse" />
                                        </div>
                                        <div className="w-4/5 h-3.5 bg-muted/40 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Container>
                </div>
            </main>
        </div>
    );
}
