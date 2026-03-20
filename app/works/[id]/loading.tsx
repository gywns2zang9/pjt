import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/layout/container";

/**
 * /works/[id] 게임 페이지 로딩 스켈레톤
 *
 * 실제 페이지(page.tsx)와 동일한 레이아웃 구조를 사용합니다:
 * - SiteHeader (실제 컴포넌트 — 즉시 렌더)
 * - "← 목록으로" 링크
 * - 타이틀 + 상태 뱃지
 * - 게임 영역 (메인 보드 + 사이드바)
 */
export default function WorksGameLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-12 lg:py-16 space-y-6">
                    {/* ← 목록으로 */}
                    <div className="w-16 h-4 bg-muted/60 rounded animate-pulse" />

                    {/* 타이틀 + 상태 뱃지 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-32 h-7 bg-muted rounded animate-pulse" />
                            <div className="w-12 h-5 bg-emerald-400/15 border border-emerald-400/30 rounded-full animate-pulse" />
                        </div>
                        <div className="w-64 h-4 bg-muted/40 rounded animate-pulse" />
                    </div>

                    {/* 게임 영역: 실제 구조와 동일한 flex 레이아웃 */}
                    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
                        {/* 모바일 HTP 스켈레톤 */}
                        <div className="order-1 lg:hidden">
                            <div className="p-4 rounded-2xl border border-border bg-card/50 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-amber-500">💡</span>
                                    <div className="w-24 h-3 bg-muted/60 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* 게임 보드 스켈레톤 */}
                        <div className="order-2 lg:flex-1 min-w-0 min-h-[500px] bg-card border border-border/60 rounded-2xl relative overflow-hidden shadow-sm">
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-[#020617] dark:via-[#020617] dark:to-[#0a0f2e]">
                                {/* 배경 도트 패턴 */}
                                <div
                                    className="absolute inset-0 pointer-events-none opacity-[0.06] dark:opacity-10"
                                    style={{
                                        backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1.5px, transparent 1.5px)',
                                        backgroundSize: '40px 40px',
                                    }}
                                />
                                {/* 중앙 가이드 라인 */}
                                <div className="absolute inset-x-0 h-px bg-primary/5 border-t border-dashed border-primary/10" style={{ top: '50%' }} />

                                {/* 로딩 인디케이터 */}
                                <div className="relative z-10 flex flex-col items-center gap-4 animate-pulse">
                                    {/* 캐릭터 스켈레톤 */}
                                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 flex items-center justify-center">
                                        <div className="w-3 h-3 rounded-full bg-primary/30" />
                                    </div>
                                    <div className="text-xs font-bold text-muted-foreground/50 tracking-[0.3em] uppercase">
                                        LOADING
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 사이드바 스켈레톤 */}
                        <div className="order-3 lg:w-64 shrink-0 flex flex-col gap-4">
                            {/* HTP (데스크톱) */}
                            <div className="hidden lg:block">
                                <div className="p-4 rounded-2xl border border-border bg-card/50 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-amber-500">💡</span>
                                        <div className="w-24 h-3 bg-muted/60 rounded animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* 랭킹 스켈레톤 */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 text-amber-500">🏆</div>
                                    <div className="w-12 h-4 bg-muted/60 rounded animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${i === 1
                                                    ? "bg-yellow-400/10 border border-yellow-400/25"
                                                    : i === 2
                                                        ? "bg-slate-400/10 border border-slate-400/20"
                                                        : "bg-orange-400/10 border border-orange-400/20"
                                                }`}
                                        >
                                            <span className="text-base shrink-0">
                                                {i === 1 ? "🥇" : i === 2 ? "🥈" : "🥉"}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="w-16 h-3 bg-muted/50 rounded animate-pulse" />
                                            </div>
                                            <div className="w-8 h-4 bg-primary/10 rounded animate-pulse" />
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
