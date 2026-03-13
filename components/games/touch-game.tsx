"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ProjectProps } from "@/components/project-registry";
import { Trophy, X, ChevronDown, Hand } from "lucide-react";
import { KakaoShareButton } from "@/components/kakao-share-button";
import { Portal } from "@/components/portal";

type GamePhase = "idle" | "go" | "result" | "fault" | "timeout";
type InputSide = "left" | "right";

interface RankEntry {
    user_name: string;
    score: number;
    created_at: string;
}

const TOTAL_TARGET = 30;
const TIME_LIMIT_MS = 10000;

export function TouchGame({ userName, title }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [progress, setProgress] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [resultTime, setResultTime] = useState<number | null>(null);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [showAllRanking, setShowAllRanking] = useState(false);
    const [activeSide, setActiveSide] = useState<InputSide | null>(null);

    const lastInputRef = useRef<InputSide | null>(null);
    const lastInputTimeRef = useRef<number>(0);
    const progressRef = useRef(0);
    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<number | null>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/touch-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    const startGame = useCallback(() => {
        setPhase("go");
        setProgress(0);
        progressRef.current = 0;
        setElapsedTime(0);
        setResultTime(null);
        lastInputRef.current = null;
        if (timerRef.current) cancelAnimationFrame(timerRef.current);

        startTimeRef.current = performance.now();

        const updateTimer = () => {
            const now = performance.now();
            const elapsed = now - startTimeRef.current;
            setElapsedTime(elapsed);

            if (elapsed >= TIME_LIMIT_MS) {
                // Timeout
                handleGameOver("timeout");
            } else {
                timerRef.current = requestAnimationFrame(updateTimer);
            }
        };
        timerRef.current = requestAnimationFrame(updateTimer);
    }, []);

    const handleGameOver = (endPhase: "fault" | "timeout") => {
        setPhase(endPhase);
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };

    const handleGameWin = useCallback((finalScoreStr: number) => {
        const finalScore = parseFloat(finalScoreStr.toFixed(3)); // 소수점 3자리
        setPhase("result");
        setResultTime(finalScore);
        setElapsedTime(finalScore * 1000); // 타이머 표시와 결과 동기화
        if (timerRef.current) cancelAnimationFrame(timerRef.current);

        if (userName !== "비회원") {
            fetch("/api/touch-scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: finalScore }),
            }).then(() => loadRanking()).catch(console.error);
        }
    }, [userName, loadRanking]);

    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleInput = useCallback((side: InputSide) => {
        if (phase !== "go") return;

        const now = performance.now();
        if (lastInputRef.current === side) {
            // 하드웨어/브라우저 바운스(10ms미만)만 무시하고 나머지는 엄격하게 실패 처리
            if (now - lastInputTimeRef.current < 10) return;

            handleGameOver("fault");
            return;
        }

        lastInputTimeRef.current = now;
        lastInputRef.current = side;
        progressRef.current += 1;
        const currentProgress = progressRef.current;
        setProgress(currentProgress);

        // 시각 피드백 로직 개선: 이전 타이머가 있다면 취소하여 빛이 씹히는 현상 방지
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        setActiveSide(side);
        feedbackTimerRef.current = setTimeout(() => {
            setActiveSide(null);
            feedbackTimerRef.current = null;
        }, 50);

        if (currentProgress >= TOTAL_TARGET) {
            handleGameWin((now - startTimeRef.current) / 1000);
        }
    }, [handleGameWin, phase]); // phase is stable during 'go', so this is fine

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

            if (e.code === "ArrowLeft") {
                e.preventDefault();
                if (!e.repeat) handleInput("left");
            } else if (e.code === "ArrowRight") {
                e.preventDefault();
                if (!e.repeat) handleInput("right");
            } else if (e.code === "Space" || e.code === "Enter") {
                // Allow starting/resetting with Space
                if (phase === "idle" || phase === "result" || phase === "fault" || phase === "timeout") {
                    e.preventDefault();
                    startGame();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleInput, phase, startGame]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timerRef.current) cancelAnimationFrame(timerRef.current);
        };
    }, []);

    // Scroll lock for touch area
    useEffect(() => {
        const blockTouchScroll = (e: TouchEvent) => {
            if (gameAreaRef.current && gameAreaRef.current.contains(e.target as Node)) {
                e.preventDefault();
            }
        };
        document.addEventListener('touchmove', blockTouchScroll, { passive: false });
        return () => document.removeEventListener('touchmove', blockTouchScroll);
    }, []);

    const displayedSeconds = Math.min(TIME_LIMIT_MS / 1000, elapsedTime / 1000).toFixed(3);
    const progressFill = Math.min(100, (elapsedTime / TIME_LIMIT_MS) * 100);

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
                <div className="order-1 lg:hidden">
                    <HTPSection />
                </div>

                <div className="order-2 lg:flex-1 min-w-0 flex flex-col p-6 space-y-6 bg-card border rounded-2xl relative overflow-hidden">

                    {/* 상단 정보 영역 (높이 고정으로 레이아웃 흔들림 방지) */}
                    <div className="min-h-[100px] flex flex-col gap-4">
                        {/* 더미와 터치 횟수 (우측 정렬 및 레이아웃 균형) */}
                        <div className="flex items-center justify-between">
                            {/* 왼쪽 공간을 채우기 위한 투명 요소 */}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full opacity-0 pointer-events-none">
                                <span className="text-[10px]">ROUND</span>
                                <span className="text-lg">1</span>
                            </div>

                            <div className="flex items-baseline gap-2 md:gap-3 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-primary/10 border border-primary/20">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl md:text-5xl font-black text-primary tabular-nums leading-none tracking-tighter">
                                        {progress}
                                    </span>
                                    <span className="text-lg md:text-xl font-bold text-primary/50 tabular-nums leading-none">
                                        / {TOTAL_TARGET}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 타이머 바 (상시 노출로 통일) */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground font-medium">TIME</span>
                                <span className={`text-sm font-black tabular-nums transition-colors ${TIME_LIMIT_MS - elapsedTime < 3000 ? "text-red-500" : "text-emerald-400"}`}>
                                    {displayedSeconds}s
                                </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${progressFill}%`,
                                        backgroundColor: TIME_LIMIT_MS - elapsedTime < 3000 ? "#ef4444" : "#34d399",
                                        transition: "none",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 게임(버튼) 영역 */}
                    <div
                        ref={gameAreaRef}
                        className="relative w-full max-w-2xl mx-auto h-64 md:h-80 select-none flex rounded-[2.5rem] overflow-hidden border-8 border-zinc-900 shadow-2xl bg-zinc-950 cursor-pointer"
                        style={{ touchAction: 'none' }}
                        onPointerDown={(e) => {
                            if (phase !== "go") return;
                            if (e.pointerType === 'mouse' && e.button !== 0) return;
                            e.preventDefault();

                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const side: InputSide = x < rect.width / 2 ? "left" : "right";
                            handleInput(side);
                        }}
                    >
                        {phase === "idle" || phase === "go" ? (
                            <>
                                {/* 왼쪽 영역 시각 피드백 */}
                                <div className={`flex-1 flex items-center justify-center relative transition-colors pointer-events-none ${activeSide === "left" ? "bg-blue-500/20 shadow-[inset_0_0_100px_rgba(59,130,246,0.3)]" : ""}`}>
                                    <div className={`absolute inset-0 border-r-4 border-zinc-900 border-dashed ${lastInputRef.current === "left" && phase === "go" ? "bg-blue-500/10" : ""}`} />
                                    <span className={`text-4xl drop-shadow-sm transition-all md:text-5xl font-black ${activeSide === "left" ? "text-blue-500 scale-110" : "text-blue-500/20"}`}>
                                        LEFT
                                    </span>
                                </div>
                                {/* 오른쪽 영역 시각 피드백 */}
                                <div className={`flex-1 flex items-center justify-center relative transition-colors pointer-events-none ${activeSide === "right" ? "bg-red-500/20 shadow-[inset_0_0_100px_rgba(239,68,68,0.3)]" : ""}`}>
                                    <div className={`absolute inset-0 ${lastInputRef.current === "right" && phase === "go" ? "bg-red-500/10" : ""}`} />
                                    <span className={`text-4xl drop-shadow-sm transition-all md:text-5xl font-black ${activeSide === "right" ? "text-red-500 scale-110" : "text-red-500/20"}`}>
                                        RIGHT
                                    </span>
                                </div>

                                {phase === "idle" && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-sm z-10">
                                        <div className="text-white px-8 py-6 rounded-3xl flex flex-col items-center animate-in zoom-in duration-300">
                                            <Hand className="w-12 h-12 mb-4 animate-bounce text-primary" />
                                            <button
                                                type="button"
                                                className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg shadow-[0_0_30px_theme(colors.primary.DEFAULT/40)] hover:scale-105 active:scale-95 transition-all outline-none"
                                                onClick={(e) => { e.stopPropagation(); startGame(); }}
                                            >
                                                게임 시작
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 pointer-events-none">
                                <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                                    {phase === "result" && resultTime !== null ? (
                                        <>
                                            <div className="text-5xl md:text-7xl font-black text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] tabular-nums tracking-tighter">
                                                {resultTime.toFixed(3)}
                                                <span className="text-2xl md:text-3xl ml-1 text-emerald-400/70">s</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {phase === "fault" ? (
                                                <span
                                                    className="font-black text-destructive italic tracking-tighter text-center drop-shadow-[0_0_15px_rgba(239,68,68,0.3)] whitespace-nowrap"
                                                    style={{ fontSize: "clamp(1.2rem, 6vw, 3rem)" }}
                                                >
                                                    성격 너무 급하시당ㅎㅎ
                                                </span>
                                            ) : (
                                                <span className="text-5xl md:text-6xl font-black text-destructive italic tracking-tighter text-center uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                                    시간 초과!
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="mt-8 flex flex-col items-center gap-3 pointer-events-auto">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); startGame(); }}
                                        className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider"
                                    >
                                        다시 시작하기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. 사이드바 */}
                <div className="order-3 lg:w-64 shrink-0 flex flex-col gap-4 pointer-events-auto">
                    <div className="hidden lg:block">
                        <HTPSection />
                    </div>

                    <RankingBoard
                        ranking={ranking}
                        onShowAll={() => setShowAllRanking(true)}
                        phase={phase}
                        resultTime={resultTime}
                    />
                </div>
            </div>

            {/* 전체 랭킹 모달 */}
            {showAllRanking && (
                <Portal>
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowAllRanking(false)}
                    >
                        <div
                            className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-sm tracking-wide text-foreground uppercase flex-1">전체 랭킹</h3>
                                <button
                                    onClick={() => setShowAllRanking(false)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-4 max-h-[60vh] overflow-y-auto">
                                <ol className="space-y-2">
                                    {ranking.map((entry, i) => (
                                        <li
                                            key={i}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${i === 0 ? "bg-yellow-400/10 border border-yellow-400/25"
                                                : i === 1 ? "bg-slate-400/10 border border-slate-400/20"
                                                    : i === 2 ? "bg-orange-400/10 border border-orange-400/20"
                                                        : "bg-muted/30 border border-transparent"
                                                }`}
                                        >
                                            <span className="text-sm font-black w-6 text-center shrink-0 text-muted-foreground">
                                                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate">{entry.user_name}</p>
                                            </div>
                                            <span className="text-sm font-black text-primary shrink-0 tabular-nums">{entry.score.toFixed(3)}s</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <div className="p-4 border-t border-border bg-muted/20">
                                {(() => {
                                    const myRankIndex = ranking.findIndex((r) => r.user_name === userName);
                                    const myBestScore = myRankIndex !== -1 ? ranking[myRankIndex].score : undefined;
                                    const displayScore = myBestScore !== undefined && myBestScore > 0 ? `${myBestScore.toFixed(3)}s` : undefined;
                                    const myRank = displayScore !== undefined ? myRankIndex + 1 : null;
                                    return (
                                        <KakaoShareButton
                                            userName={userName}
                                            gameTitle={title!}
                                            gameUrl="/works/touch-game"
                                            displayScore={displayScore}
                                            rank={myRank}
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    );
}

function HTPSection() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="p-4 rounded-2xl border border-border bg-card/50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full transition-colors"
            >
                <span className="text-amber-500">💡</span>
                <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase flex-1 text-left">How to Play</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <ul className="space-y-2.5 text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">01</span>
                        <span><strong>왼쪽</strong>과 <strong>오른쪽</strong>을 번갈아 터치하세요. <br />PC로는 <strong>방향키</strong>로도 가능해요.</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">02</span>
                        <span><strong>30회</strong>를 채우는데 걸리는 시간을 측정해요.</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">03</span>
                        <span><strong>연속으로 같은 쪽</strong>을 터치하면 바로 끝나요.</span>
                    </li>
                </ul>
            )}
        </div>
    );
}

function RankingBoard({ ranking, onShowAll, phase, resultTime }: { ranking: RankEntry[], onShowAll: () => void, phase: GamePhase, resultTime: number | null }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-sm tracking-wide text-foreground uppercase flex-1">TOP 3</h2>
                {ranking.length > 0 && (
                    <button
                        onClick={onShowAll}
                        className="text-[10px] font-bold text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                        전체보기
                    </button>
                )}
            </div>

            {ranking.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">아직 기록이 없어요</p>
            ) : (
                <ol className="space-y-2">
                    {ranking.slice(0, 3).map((entry, i) => (
                        <li
                            key={i}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${i === 0
                                ? "bg-yellow-400/10 border border-yellow-400/25"
                                : i === 1 ? "bg-slate-400/10 border border-slate-400/20"
                                    : "bg-orange-400/10 border border-orange-400/20"
                                }`}
                        >
                            <span className="text-base shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{entry.user_name}</p>
                            </div>
                            <span className="text-sm font-black text-primary shrink-0 tabular-nums">{entry.score.toFixed(3)}s</span>
                        </li>
                    ))}
                </ol>
            )}

        </div>
    );
}
