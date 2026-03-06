"use client";


import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ProjectProps } from "@/components/project-registry";
import { Button } from "@/components/ui/button";

type GamePhase = "idle" | "ready" | "sequence" | "go" | "result" | "fault" | "timeout";

interface RankEntry {
    user_name: string;
    score: number;
    created_at: string;
}

export function SpeedGame({ userName }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [activeLights, setActiveLights] = useState(0); // 0 to 5
    const [resultTime, setResultTime] = useState<number | null>(null);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [feedback, setFeedback] = useState<string>("");

    // Refs
    const sequenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const goTimerRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/speed-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    const clearTimers = () => {
        if (sequenceTimerRef.current) clearInterval(sequenceTimerRef.current);
        if (goTimerRef.current) clearTimeout(goTimerRef.current);
        if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };

    const startSequence = useCallback(() => {
        setPhase("sequence");
        setActiveLights(0);
        setResultTime(null);
        setFeedback("");
        clearTimers();

        let l = 1;
        setActiveLights(l);

        sequenceTimerRef.current = setInterval(() => {
            l++;
            if (l <= 3) {
                setActiveLights(l);
                if (l === 3) {
                    if (sequenceTimerRef.current) clearInterval(sequenceTimerRef.current);
                    // 3개의 불이 모두 켜진 즉시 랜덤 대기 시작 (0.2초 ~ 5초)
                    const randomDelay = Math.random() * 4800 + 200;
                    goTimerRef.current = setTimeout(() => {
                        setActiveLights(0); // LIGHTS OUT!
                        setPhase("go");
                        startTimeRef.current = performance.now();
                    }, randomDelay);
                }
            }
        }, 1000); // 1초마다 하나씩 점등
    }, []);

    const handlePointerDown = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
        // 모바일/데스크톱 텍스트 선택 등 방지
        // e.preventDefault(); // allow native scrolling

        if (phase === "idle" || phase === "result" || phase === "fault" || phase === "timeout") {
            startSequence();
        }
    };

    const handlePointerUp = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
        // e.preventDefault(); // allow native scrolling

        if (phase === "idle" || phase === "result" || phase === "fault" || phase === "timeout") return;

        if (phase === "sequence") {
            clearTimers();
            const msg = activeLights < 3 ? "기다리세요" : "예측하지 마세요";
            setPhase("fault");
            setFeedback(msg);
            return;
        }

        if (phase === "go") {
            const endTime = performance.now();
            const timeDiff = endTime - startTimeRef.current;
            const timeInSeconds = timeDiff / 1000;
            // 성능 측정용 performance.now()는 마이크로초(소수점 6자리 이상)까지도 측정이 가능합니다.
            // 사용자가 최대한 세밀하게 보고 싶어하여 소수점 5자리(10만분의 1초)로 조정했습니다.
            const finalScore = parseFloat(timeInSeconds.toFixed(5)); // 소수점 5자리

            clearTimers();

            setPhase("result");
            setResultTime(finalScore);

            let msg = "분발하세요";
            if (finalScore < 0.020) msg = "잘 찍었네요";
            else if (finalScore < 0.070) msg = "고양이 수준입니다.";
            else if (finalScore < 0.160) msg = "프로게이머 수준입니다";
            else if (finalScore < 0.250) msg = "20대 평균입니다";
            else if (finalScore < 0.300) msg = "30대가 분명합니다";
            else if (finalScore < 0.400) msg = "Hi, Young Forty!";

            setFeedback(msg);

            if (userName !== "비회원") {
                fetch("/api/speed-scores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ score: finalScore }),
                }).then(() => loadRanking()).catch(console.error);
            }
        }
    };

    // 0.5초(500ms) 이상 미반응 시 자동 종료
    useEffect(() => {
        if (phase === "go") {
            timeoutTimerRef.current = setTimeout(() => {
                const msg = "집중하세요.";
                setPhase("timeout");
                setFeedback(msg);
                clearTimers();
            }, 500);
        }
        return () => {
            if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
        };
    }, [phase]);

    // 컴포넌트 언마운트 시 타이머 정리
    useEffect(() => {
        return () => clearTimers();
    }, []);

    // Lock/Unlock page scroll during game phases
    useEffect(() => {
        if (phase === "sequence" || phase === "go") {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [phase]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
            {/* ── 게임 영역 ── */}
            <div className="flex-1 min-w-0 flex flex-col items-center p-6 space-y-6 bg-card border rounded-2xl relative overflow-hidden">
                {/* 불빛 및 결과 표시 영역 (통합) */}
                <div className={`w-full max-w-2xl h-32 md:h-40 bg-zinc-950 rounded-[2.5rem] border-8 border-zinc-900 shadow-2xl pointer-events-none flex flex-col items-center justify-center transition-all duration-500 mx-auto mt-4 overflow-hidden relative
                    ${(phase === "result") ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]" : (phase === "fault" || phase === "timeout") ? "border-destructive/50" : ""}`}>

                    {(phase === "result" || phase === "fault" || phase === "timeout") ? (
                        <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                            {phase === "result" && resultTime !== null ? (
                                <>
                                    <div className="text-5xl md:text-6xl font-black text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] tabular-nums tracking-tighter">
                                        {(resultTime * 1000).toFixed(2)}
                                        <span className="text-2xl ml-1 text-emerald-400/70">ms</span>
                                    </div>
                                </>
                            ) : phase === "fault" ? (
                                <>
                                    <span className="text-5xl md:text-6xl font-black text-destructive italic tracking-tighter underline decoration-double">FOUL!</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-5xl md:text-6xl font-black text-destructive italic tracking-tighter underline decoration-double text-center">TIME<br className="md:hidden" />OUT!</span>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-row justify-center gap-3 md:gap-5 items-center w-full px-4 animate-in fade-in duration-500">
                            {[1, 2, 3].map((idx) => {
                                const isLit = activeLights >= idx;
                                return (
                                    <div key={idx} className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-slate-800 border-2 border-slate-950/50 shadow-inner relative flex items-center justify-center shrink-0">
                                        <div className={`absolute inset-0 rounded-full transition-all duration-75 ${isLit ? 'bg-red-500 shadow-[0_0_20px_theme(colors.red.500),inset_0_0_10px_theme(colors.white)]' : 'bg-transparent'}`} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>


                {/* ── 터치 전용 영역 ── */}
                <div
                    className={`relative border-4 border-solid rounded-[2.5rem] overflow-hidden w-full max-w-2xl h-64 md:h-80 flex flex-col items-center justify-center transition-all cursor-pointer select-none
                        ${(phase === 'sequence' || phase === 'go') ? 'border-primary/50 bg-primary/10 shadow-inner scale-[0.98]' : 'bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-800 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/80'}`}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    {phase === "idle" ? (
                        <div className="flex flex-col items-center pointer-events-none">
                            <div className="text-muted-foreground font-bold tracking-widest animate-pulse text-center">
                                화면을 길게 누르세요!
                            </div>
                        </div>
                    ) : (phase === "result" || phase === "fault" || phase === "timeout") ? (
                        <div className="flex flex-col items-center pointer-events-none animate-in zoom-in duration-300 px-6">
                            <div className={`text-3xl md:text-4xl font-black mb-4 text-center leading-tight drop-shadow-sm
                                ${phase === "result" ? "text-emerald-500" : "text-destructive"}`}>
                                {feedback}
                            </div>
                            <div className="text-muted-foreground text-xs md:text-sm font-bold tracking-[0.2em] animate-pulse uppercase">
                                다시 도전하려면 길게 누르세요
                            </div>
                        </div>
                    ) : (
                        <div className="text-xl font-bold text-foreground text-center animate-in zoom-in pointer-events-none px-6">
                            불이 모두 꺼지면<br />손을 떼세요!
                        </div>
                    )}
                </div>


            </div>

            {/* ── 사이드바: 랭킹 ── */}
            <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4 pointer-events-auto">
                {/* 랭킹 보드 */}
                <div className="order-2 lg:order-1 rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        <h2 className="font-bold text-sm tracking-wide text-foreground uppercase">TOP 3</h2>
                    </div>

                    {ranking.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">
                            아직 기록이 없어요<br />
                        </p>
                    ) : (
                        <ol className="space-y-2">
                            {ranking.slice(0, 3).map((entry, i) => (
                                <li
                                    key={i}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${i === 0
                                        ? "bg-yellow-400/10 border border-yellow-400/25"
                                        : i === 1
                                            ? "bg-slate-400/10 border border-slate-400/20"
                                            : i === 2
                                                ? "bg-orange-400/10 border border-orange-400/20"
                                                : "bg-muted/30"
                                        }`}
                                >
                                    <span className="text-base shrink-0">
                                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{entry.user_name}</p>
                                    </div>
                                    <span className="text-sm font-black text-primary shrink-0 tabular-nums">{(entry.score * 1000).toFixed(2)}ms</span>
                                </li>
                            ))}
                        </ol>
                    )}

                    {phase === "result" && resultTime !== null && (
                        <div className="pt-3 border-t border-border animate-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-primary/10 border border-primary/20">
                                <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">My Record</span>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-xl font-black text-foreground tabular-nums tracking-tighter">{(resultTime * 1000).toFixed(2)}</span>
                                    <span className="text-sm font-bold text-muted-foreground">ms</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* How to Play */}
                <div className="order-1 lg:order-2 p-4 rounded-2xl border border-border bg-card/50">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-500">💡</span>
                        <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">How to Play</span>
                    </div>
                    <ul className="space-y-2.5 text-[11px] text-muted-foreground">
                        <li className="flex items-baseline gap-2">
                            <span className="text-primary font-bold shrink-0 leading-none">01</span>
                            <span>화면을 <strong className="text-foreground">길게 누르면</strong> 신호등이 점등돼요</span>
                        </li>
                        <li className="flex items-baseline gap-2">
                            <span className="text-primary font-bold shrink-0 leading-none">02</span>
                            <span>불 3개가 모두 켜졌다가 <strong className="text-foreground">꺼지는 순간</strong> 손을 떼세요</span>
                        </li>
                        <li className="flex items-baseline gap-2">
                            <span className="text-primary font-bold shrink-0 leading-none">03</span>
                            <span>누른 채로 기다렸다가 불이 꺼지면 떼세요. <strong className="text-foreground">미리 떼지 마세요</strong></span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
