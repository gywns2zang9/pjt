"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { PageViewTracker } from "@/components/page-view-tracker";

/* ── Animated Counter ── */
function Counter({ value }: { value: number }) {
    const [n, setN] = useState(0);

    useEffect(() => {
        let start: number;
        const dur = 2000;
        const tick = (t: number) => {
            if (!start) start = t;
            const p = Math.min((t - start) / dur, 1);
            const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            setN(Math.floor(ease * value));
            if (p < 1) requestAnimationFrame(tick);
            else setN(value);
        };
        requestAnimationFrame(tick);
    }, [value]);

    return <>{n.toLocaleString()}</>;
}

/* ── Taglines ── */
const TAGLINES = [
    "심심할 땐, 뚝딱!",
    "오늘도 한 판 어때요?",
    "일하기 전 손 풀기 ㄱㄱ?",
    "같이 월루할래요?",
    "한 판은 금방 끝나요. 아시죠?",
    "출퇴근길 덜 지루하게",
    "좋은 하루 보내세요!",
    "점심시간 커피 내기 뚝딱!"
];

/* ── Main Component ── */
export default function HomeClient({
    visitorCount,
    playCount,
    userCount,
}: {
    visitorCount: number;
    playCount: number;
    userCount: number;
}) {
    const [tagline] = useState(
        () => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]
    );

    return (
        <div className="bg-[#020617] text-slate-100 overflow-hidden selection:bg-primary/30 h-[calc(100vh-4rem)]">
            <PageViewTracker path="/" />

            <section className="relative h-full flex flex-col items-center justify-center">
                {/* ambient bg */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
                    <div className="absolute top-[20%] left-[10%] w-[30vw] h-[30vw] bg-blue-600/5 rounded-full blur-[100px]" />
                </div>

                <Container className="relative z-10 flex flex-col items-center text-center gap-10 md:gap-14">
                    {/* Title + Tagline */}
                    <div className="space-y-4">
                        <h1
                            className="text-6xl md:text-9xl font-black tracking-tighter drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000"
                            style={{ animationFillMode: "both" }}
                        >
                            뚝딱실
                        </h1>
                        <p
                            className="text-lg md:text-2xl text-slate-400 font-medium animate-in fade-in slide-in-from-bottom-4 duration-1000"
                            style={{ animationDelay: "400ms", animationFillMode: "both" }}
                        >
                            {tagline}
                        </p>
                    </div>

                    {/* Stats */}
                    <div
                        className="grid grid-cols-3 gap-8 md:gap-16 animate-in fade-in slide-in-from-bottom-4 duration-1000"
                        style={{ animationDelay: "800ms", animationFillMode: "both" }}
                    >
                        <div className="flex flex-col items-center">
                            <span className="text-2xl md:text-5xl font-black text-white italic tabular-nums">
                                <Counter value={visitorCount} />
                            </span>
                            <span className="mt-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                                총 방문
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-2xl md:text-5xl font-black text-white italic tabular-nums">
                                <Counter value={playCount} />
                            </span>
                            <span className="mt-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                                플레이
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-2xl md:text-5xl font-black text-white italic tabular-nums">
                                <Counter value={userCount} />
                            </span>
                            <span className="mt-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                                친구들
                            </span>
                        </div>
                    </div>

                    {/* CTA */}
                    <div
                        className="animate-in fade-in slide-in-from-bottom-4 duration-1000"
                        style={{ animationDelay: "1200ms", animationFillMode: "both" }}
                    >
                        <Link
                            href="/works"
                            className="group relative flex items-center gap-3 px-10 py-4 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-500 hover:scale-105"
                        >
                            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/60 via-blue-400/40 to-primary/60 p-px">
                                <span className="absolute inset-0 rounded-full bg-slate-950/80 backdrop-blur-sm" />
                            </span>
                            <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] blur-sm" />
                            <span className="relative text-slate-300 group-hover:text-white transition-colors duration-300">
                                둘러보기
                            </span>
                            <ArrowRight className="relative w-4 h-4 text-primary group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </Container>
            </section>
        </div>
    );
}
