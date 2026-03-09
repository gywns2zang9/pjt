"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trophy, X, ChevronDown } from "lucide-react";
import { type ProjectProps } from "@/components/project-registry";
import { Button } from "@/components/ui/button";

type GamePhase = "idle" | "playing" | "result" | "gameover";

interface RankEntry {
    user_name: string;
    score: number;
}

export function SortGame({ userName }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [blocks, setBlocks] = useState<number[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [showAllRanking, setShowAllRanking] = useState(false);
    const [shake, setShake] = useState(false);
    const [resultType, setResultType] = useState<"success" | "timeout" | null>(null);

    const TIME_LIMIT = 30; // 30s max

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const phaseRef = useRef<GamePhase>("idle");
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    // ─── Ranking ──────────────────────────────────────────
    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/sort-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    const saveScore = useCallback(async (finalVal: number) => {
        if (userName === "비회원" || finalVal <= 0 || finalVal >= TIME_LIMIT) return;
        try {
            await fetch("/api/sort-scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: finalVal }),
            });
            loadRanking();
        } catch { }
    }, [userName, loadRanking]);

    // ─── Timers ───────────────────────────────────────────
    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startTimer = useCallback(() => {
        stopTimer();
        setElapsedTime(0);
        startTimeRef.current = performance.now();
        timerRef.current = setInterval(() => {
            const now = performance.now();
            const elapsed = (now - startTimeRef.current) / 1000;
            if (elapsed >= TIME_LIMIT) {
                setElapsedTime(TIME_LIMIT);
                stopTimer();
                handleTimeout();
            } else {
                setElapsedTime(Number(elapsed.toFixed(2)));
            }
        }, 10);
    }, [stopTimer]);

    useEffect(() => {
        return () => stopTimer();
    }, [stopTimer]);

    // ─── Game Logic ───────────────────────────────────────
    const generateShuffledBlocks = () => {
        let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        do {
            arr = [...arr].sort(() => Math.random() - 0.5);
        } while (isSorted(arr));
        return arr;
    };

    const isSorted = (arr: number[]) => {
        for (let i = 1; i < arr.length; i++) {
            if (arr[i] < arr[i - 1]) return false;
        }
        return true;
    };

    const handleTimeout = useCallback(() => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setResultType("timeout");
        setPhase("result");

        setTimeout(() => {
            setPhase("gameover");
        }, 1200);
    }, []);

    const handleGiveUp = useCallback(() => {
        stopTimer();
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setResultType("timeout");
        setPhase("result");

        setTimeout(() => {
            setPhase("gameover");
        }, 1200);
    }, [stopTimer]);

    const handleSuccess = useCallback((finalTime: number) => {
        stopTimer();
        setResultType("success");
        setPhase("result");

        setTimeout(() => {
            setPhase("gameover");
            saveScore(finalTime);
        }, 1500);
    }, [saveScore, stopTimer]);

    const handleStart = () => {
        setBlocks(generateShuffledBlocks());
        setSelectedIndex(null);
        setResultType(null);
        setPhase("playing");
        startTimer();
    };

    const handleBlockClick = (index: number) => {
        if (phase !== "playing") return;

        if (selectedIndex === null) {
            setSelectedIndex(index);
        } else {
            if (selectedIndex === index) {
                setSelectedIndex(null); // Deselect
            } else {
                // Swap
                const newBlocks = [...blocks];
                const temp = newBlocks[selectedIndex];
                newBlocks[selectedIndex] = newBlocks[index];
                newBlocks[index] = temp;

                setBlocks(newBlocks);
                setSelectedIndex(null);

                if (isSorted(newBlocks)) {
                    // 계산된 즉시 타이머 스탑 및 시간 기록
                    const finalTime = Number(((performance.now() - startTimeRef.current) / 1000).toFixed(2));
                    setElapsedTime(finalTime);
                    handleSuccess(finalTime);
                }
            }
        }
    };

    // 키보드 지원 (시작/재시작)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

            if (e.code === "Space") {
                if (phaseRef.current === "idle" || phaseRef.current === "gameover") {
                    e.preventDefault();
                    handleStart();
                }
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [handleStart]);

    // ─── Render UI ─────────────────────────────────────────
    const progressPct = (elapsedTime / TIME_LIMIT) * 100;
    const timerColor = progressPct > 75 ? "#ef4444" : progressPct > 50 ? "#fb923c" : "#34d399";
    const timerTextCls = progressPct > 75 ? "text-red-500" : progressPct > 50 ? "text-orange-400" : "text-emerald-400";

    const renderBlocks = () => {
        if (phase === "idle") {
            const previewBlocks = [3, 7, 2, 8, 4, 10, 1, 6, 9, 5];
            return previewBlocks.map((val, i) => (
                <div key={i} className="flex-1 max-w-10 rounded-t-xl bg-muted/30 border-t-2 border-l border-r border-border/50 items-end flex justify-center pb-2 opacity-50" style={{ height: `${val * 10}%` }}></div>
            ));
        }

        return blocks.map((val, i) => {
            const isSelected = selectedIndex === i;
            const isFinished = phase === "result" && resultType === "success";

            let bgClass = "bg-primary/20 border-primary/30 text-primary";
            if (isSelected) {
                bgClass = "bg-amber-400 border-amber-500 text-amber-900 shadow-lg shadow-amber-500/20 z-10 scale-105";
            } else if (isFinished) {
                bgClass = "bg-emerald-400 border-emerald-500 text-emerald-900 shadow-md";
            } else {
                bgClass = "bg-card border-border hover:bg-primary/10 hover:border-primary/40 cursor-pointer shadow-sm active:scale-95";
            }

            return (
                <div
                    key={i}
                    onClick={() => handleBlockClick(i)}
                    className={`relative flex-1 max-w-12 rounded-t-lg md:rounded-t-2xl border-t-2 border-l border-r transition-all duration-300 flex items-start justify-center pt-2 md:pt-4 ${bgClass} ${!isSelected && !isFinished && phase === 'playing' ? 'hover:scale-105 hover:z-10' : ''}`}
                    style={{ height: `${val * 10}%` }}
                >
                    <span className="text-xs md:text-sm font-black opacity-80">{val}</span>
                </div>
            );
        });
    };

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
                <div className="order-1 lg:hidden">
                    <HTPSection />
                </div>

                <div className="order-2 lg:flex-1 min-w-0">
                    <div className={`relative rounded-2xl border border-border bg-card overflow-hidden transition-all ${shake ? "animate-shake" : ""}`}>
                        <div className="flex flex-col p-4 md:p-6 gap-4 md:gap-5">

                            {/* Header Info */}
                            <div className="min-h-[100px] flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 border border-primary/20">
                                        <span className="text-[10px] md:text-xs text-muted-foreground font-medium">RECORD</span>
                                        <span className="text-lg md:text-2xl font-black text-primary tabular-nums">
                                            {resultType === 'success' || phase === 'gameover' && resultType !== 'timeout' ? elapsedTime.toFixed(2) + 's' : '--'}
                                        </span>
                                    </div>
                                </div>

                                {/* Timer Bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-muted-foreground font-medium">TIME ELAPSED</span>
                                        <span className={`text-sm font-black tabular-nums transition-colors ${phase === 'playing' ? timerTextCls : 'text-muted-foreground'}`}>
                                            {phase === 'playing' ? `${elapsedTime.toFixed(2)}s / ${TIME_LIMIT}s` : phase === 'idle' ? `0.00s / ${TIME_LIMIT}s` : `${elapsedTime.toFixed(2)}s`}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${Math.min(100, progressPct)}%`,
                                                backgroundColor: phase === 'playing' ? timerColor : '#cbd5e1',
                                                transition: "width 50ms linear, background-color 0.3s",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Center message */}
                            <div className="text-center h-8 flex flex-col items-center justify-center transition-all duration-300">
                                {phase === "idle" && (
                                    <p className="text-sm font-medium text-muted-foreground">
                                        블록을 오름차순으로 정렬해주세요!
                                    </p>
                                )}
                                {phase === "playing" && (
                                    <p className="text-sm font-bold text-indigo-500 animate-pulse">
                                        두 블록을 클릭하여 위치를 바꾸세요
                                    </p>
                                )}
                                {phase === "result" && resultType === "success" && (
                                    <p className="text-sm font-bold text-emerald-500 animate-in fade-in duration-200">정렬 완료! ({elapsedTime.toFixed(2)}초)</p>
                                )}
                                {phase === "result" && resultType === "timeout" && (
                                    <p className="text-sm font-bold text-orange-500 animate-in fade-in duration-200">시간 초과!</p>
                                )}
                                {phase === "gameover" && resultType === "timeout" && (
                                    <p className="text-sm font-bold text-destructive animate-in fade-in duration-200">
                                        정렬 실패!
                                    </p>
                                )}
                            </div>

                            {/* Game Grid */}
                            <div className="flex w-full justify-center items-end py-2 h-[280px] md:h-[340px] px-2 md:px-6 gap-1 md:gap-2">
                                {renderBlocks()}
                            </div>

                            {/* Controls */}
                            <div className="min-h-[48px] flex items-center justify-center gap-2">
                                {(phase === "idle" || phase === "gameover") && (
                                    <div className="w-full animate-in zoom-in duration-300">
                                        <Button
                                            variant="default"
                                            onClick={handleStart}
                                            className="w-full font-bold h-12 text-md transition-all shadow-sm group relative"
                                        >
                                            {phase === "idle" ? "게임 시작" : "다시 시작"}
                                            <span className="hidden sm:inline-flex absolute right-4 items-center gap-1.5 px-1.5 py-0.5 rounded border border-white/30 bg-white/20 text-[10px] font-medium tracking-tight">
                                                Space
                                            </span>
                                        </Button>
                                    </div>
                                )}

                                {phase === "playing" && (
                                    <div className="w-full animate-in zoom-in duration-300">
                                        <Button
                                            variant="outline"
                                            onClick={handleGiveUp}
                                            className="w-full font-bold h-12 text-md transition-all border border-destructive/30 text-destructive hover:bg-destructive/10 active:scale-95 shadow-sm"
                                        >
                                            게임 포기
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="order-3 lg:w-64 shrink-0 flex flex-col gap-4">
                    <div className="hidden lg:block">
                        <HTPSection />
                    </div>

                    <div className="order-2 lg:order-1 flex flex-col gap-4">
                        <RankingBoard ranking={ranking} onShowAll={() => setShowAllRanking(true)} />
                    </div>
                </div>
            </div>

            {/* Ranking Modal */}
            {showAllRanking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAllRanking(false)}>
                    <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <h3 className="font-bold text-sm tracking-wide text-foreground uppercase flex-1">전체 랭킹</h3>
                            <button onClick={() => setShowAllRanking(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            <ol className="space-y-2">
                                {ranking.map((entry, i) => (
                                    <li key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${i === 0 ? "bg-yellow-400/10 border border-yellow-400/25" : i === 1 ? "bg-slate-400/10 border border-slate-400/20" : i === 2 ? "bg-orange-400/10 border border-orange-400/20" : "bg-muted/30 border border-transparent"}`}>
                                        <span className="text-sm font-black w-6 text-center shrink-0 text-muted-foreground">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{entry.user_name}</p>
                                        </div>
                                        <span className="text-sm font-black text-primary shrink-0">{entry.score}s</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function HTPSection() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="p-4 rounded-2xl border border-border bg-card/50">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 w-full transition-colors">
                <span className="text-amber-500">💡</span>
                <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase flex-1 text-left">How to Play</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <ul className="space-y-2.5 text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">01</span>
                        <span>블록을 <strong>오름차순</strong> 정렬하세요.</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">02</span>
                        <span>두 개의 블록을 선택해 위치를 바꾸세요.</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">03</span>
                        <span>제한 시간은 <strong>30초</strong>입니다.</span>
                    </li>
                </ul>
            )}
        </div>
    );
}

function RankingBoard({ ranking, onShowAll }: { ranking: RankEntry[], onShowAll: () => void }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-sm tracking-wide text-foreground uppercase flex-1">TOP 3</h2>
                {ranking.length > 0 && <button onClick={onShowAll} className="text-[10px] font-bold text-primary hover:text-primary/80 hover:underline transition-colors">전체보기</button>}
            </div>
            {ranking.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">아직 기록이 없어요</p>
            ) : (
                <ol className="space-y-2">
                    {ranking.slice(0, 3).map((entry, i) => (
                        <li key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${i === 0 ? "bg-yellow-400/10 border border-yellow-400/25" : i === 1 ? "bg-slate-400/10 border border-slate-400/20" : "bg-orange-400/10 border border-orange-400/20"}`}>
                            <span className="text-base shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{entry.user_name}</p>
                            </div>
                            <span className="text-sm font-black text-primary shrink-0">{entry.score}s</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
