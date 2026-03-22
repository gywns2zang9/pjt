import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/layout/container";

/**
 * /works/[id] 게임 페이지 로딩 스켈레톤
 * 
 * 모든 게임의 공통 구조를 반영한 이상적인 스켈레톤입니다:
 * - 상단: 뒤로가기, 타이틀, 상태 뱃지
 * - 메인: 게임 보드 (점수/타이머 헤더 + 중앙 영역 + 하단 컨트롤)
 * - 사이드바: 도움말(HTP) + 랭킹 보드
 */
export default function WorksGameLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
            <SiteHeader />
            <main className="flex-1">
                <Container className="py-8 lg:py-12 space-y-6">
                    {/* 상단 네비게이션 & 타이틀 영역 */}
                    <div className="space-y-6">
                        <div className="w-20 h-4 bg-muted/60 rounded animate-pulse" />
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-48 h-8 bg-muted rounded-lg animate-pulse" />
                                <div className="w-14 h-6 bg-muted/40 rounded-full animate-pulse" />
                            </div>
                            <div className="w-full max-w-[320px] sm:w-80 h-4 bg-muted/30 rounded animate-pulse" />
                        </div>
                    </div>

                    {/* 게임 레이아웃: 메인 보드 + 사이드바 */}
                    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">

                        {/* 모바일 HTP (Mobile Only) */}
                        <div className="order-1 lg:hidden">
                            <div className="p-4 rounded-2xl border border-border bg-card/50 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-amber-500/20 rounded-full animate-pulse" />
                                    <div className="w-24 h-3 bg-muted/60 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* 메인 게임 보드 스켈레톤 */}
                        <div className="order-2 lg:flex-1 min-w-0">
                            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                                <div className="p-4 md:p-6 space-y-6">
                                    {/* 게임 헤더: 점수 / 타이머 / 라운드 */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/50">
                                            <div className="w-16 h-4 bg-muted/60 rounded animate-pulse" />
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
                                            <div className="w-16 h-4 bg-primary/20 rounded animate-pulse" />
                                        </div>
                                    </div>

                                    {/* 타이머 바 */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <div className="w-8 h-3 bg-muted/40 rounded animate-pulse" />
                                            <div className="w-12 h-3 bg-muted/40 rounded animate-pulse" />
                                        </div>
                                        <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden">
                                            <div className="w-full h-full bg-muted/40 animate-pulse" />
                                        </div>
                                    </div>

                                    {/* 중앙 게임 영역 Placeholder */}
                                    <div className="w-full aspect-[4/3] md:aspect-video min-h-[300px] bg-muted/5 rounded-2xl border border-dashed border-border/60 relative overflow-hidden">
                                        {/* 로딩 인디케이터 (중앙) */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                                            <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary/30 animate-spin" />
                                            <div className="w-20 h-3 bg-muted/40 rounded animate-pulse" />
                                        </div>

                                        {/* 배경 데코레이션 (공통적인 느낌의 도트 패턴) */}
                                        <div
                                            className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                                            style={{
                                                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                                                backgroundSize: '24px 24px'
                                            }}
                                        />
                                    </div>

                                    {/* 하단 컨트롤 영역 (버튼 등) */}
                                    <div className="h-12 w-full bg-muted/20 rounded-xl animate-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* 사이드바 스켈레톤 */}
                        <div className="order-3 lg:w-64 shrink-0 flex flex-col gap-4">
                            {/* 데스크탑 HTP */}
                            <div className="hidden lg:block">
                                <div className="p-4 rounded-2xl border border-border bg-card/50 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-amber-500/20 rounded-full animate-pulse" />
                                        <div className="w-24 h-3 bg-muted/60 rounded animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* 랭킹 보드 스켈레톤 */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                                    <div className="w-5 h-5 bg-amber-500/20 rounded-full animate-pulse" />
                                    <div className="w-20 h-4 bg-muted/60 rounded animate-pulse" />
                                </div>
                                <div className="space-y-3 pt-1">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-muted/30 animate-pulse flex-shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="w-full h-3 bg-muted/40 rounded animate-pulse" />
                                                <div className="w-2/3 h-2 bg-muted/20 rounded animate-pulse" />
                                            </div>
                                            <div className="w-10 h-4 bg-primary/5 rounded animate-pulse flex-shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 추가 섹션 (예: 히스토리 등 공통 여백용) */}
                            <div className="h-48 rounded-2xl border border-dashed border-border/40 bg-muted/5 animate-pulse" />
                        </div>
                    </div>
                </Container>
            </main>
        </div>
    );
}

