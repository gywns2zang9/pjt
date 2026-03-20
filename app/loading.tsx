/**
 * 루트 loading.tsx — Next.js가 서버 컴포넌트(page.tsx)를 로딩하는 동안
 * 즉시 보여주는 스켈레톤 UI입니다.
 *
 * 홈 페이지의 어두운 배경을 그대로 사용하여
 * 하얀 화면(Flash of White)을 완전히 방지합니다.
 */
export default function Loading() {
    return (
        <div className="bg-[#020617] text-slate-100 min-h-screen flex flex-col">
            {/* Header skeleton */}
            <div className="h-16 border-b border-slate-800/50 bg-[#020617]/80 backdrop-blur flex items-center px-6">
                <div className="w-16 h-5 bg-slate-800 rounded animate-pulse" />
                <div className="ml-4 w-12 h-4 bg-slate-800/60 rounded animate-pulse" />
            </div>

            {/* Main content skeleton */}
            <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
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
        </div>
    );
}
