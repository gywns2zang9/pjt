import { SiteHeader } from "@/components/layout/site-header";

/**
 * 루트 loading.tsx — 홈 페이지 전용 로딩 스켈레톤.
 * SiteHeader는 서버 컴포넌트이므로 즉시 렌더링되고,
 * 본문만 스켈레톤으로 표시합니다.
 */
export default function Loading() {
    return (
        <>
            <SiteHeader />

            <div className="bg-[#020617] text-slate-100 h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-10 px-6">
                {/* Title skeleton */}
                <div className="flex flex-col items-center gap-4">
                    <div className="w-48 h-16 md:w-72 md:h-24 bg-slate-800/50 rounded-lg animate-pulse" />
                    <div className="w-56 h-5 bg-slate-800/30 rounded animate-pulse" />
                </div>

                {/* Stats skeleton */}
                <div className="grid grid-cols-3 gap-8 md:gap-16">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-12 h-8 md:w-20 md:h-10 bg-slate-800/50 rounded animate-pulse" />
                            <div className="w-10 h-3 bg-slate-800/30 rounded animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* CTA skeleton */}
                <div className="w-40 h-12 bg-slate-800/40 rounded-full animate-pulse" />
            </div>
        </>
    );
}
