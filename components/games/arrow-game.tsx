"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ProjectProps } from "@/components/project-registry";
import { Trophy, X, ChevronDown, Lock } from "lucide-react";
import { KakaoShareButton } from "@/components/kakao-share-button";
import { Portal } from "@/components/portal";

type GamePhase = "idle" | "playing" | "result";

interface RankEntry {
    user_name: string;
    score: number;
    created_at: string;
}

export function ArrowGame({ userName, title }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [score, setScore] = useState(0);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [showAllRanking, setShowAllRanking] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [showRestartMessage, setShowRestartMessage] = useState(false);

    // 렌더에 필요한 최소 state만 유지
    const [distance, setDistance] = useState(0);
    const [arrowY, setArrowY] = useState(50);
    const [topBoundary, setTopBoundary] = useState(0);
    const [bottomBoundary, setBottomBoundary] = useState(100);
    const [boundaryHistory, setBoundaryHistory] = useState<{ y: number, type: 'top' | 'bottom' }[]>([]);

    // 게임 로직용 ref (리렌더 유발 없음)
    const gameLoopRef = useRef<number | null>(null);
    const lastTickRef = useRef<number>(0);
    const distanceRef = useRef(0);
    const arrowYRef = useRef(50);
    const directionRef = useRef<"up" | "down">("up");
    const topBoundaryRef = useRef(0);
    const bottomBoundaryRef = useRef(100);
    const trailRef = useRef<{ d: number, y: number }[]>([]);
    const scoreRef = useRef(0);
    const isPlayingRef = useRef(false);
    const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const characterRef = useRef<HTMLDivElement>(null);
    const pulseTimerRef = useRef<NodeJS.Timeout | null>(null);

    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/arrow-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);


    // endGame을 ref로 감싸서 tick에서 최신 버전 참조
    const endGameRef = useRef<() => void>(() => { });

    const startGame = useCallback(() => {
        setPhase("playing");
        isPlayingRef.current = true;
        setShowRestartMessage(false);
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

        const initialDir = Math.random() > 0.5 ? "up" : "down";
        setScore(0);
        scoreRef.current = 0;
        setDistance(0);
        distanceRef.current = 0;
        setArrowY(50);
        arrowYRef.current = 50;
        directionRef.current = initialDir;
        trailRef.current = [{ d: 0, y: 50 }];

        setTopBoundary(0);
        topBoundaryRef.current = 0;
        setBottomBoundary(100);
        bottomBoundaryRef.current = 100;
        setBoundaryHistory([
            { y: 0, type: 'top' },
            { y: 100, type: 'bottom' }
        ]);

        lastTickRef.current = performance.now();

        const tick = (t: number) => {
            if (!isPlayingRef.current) return;

            const delta = (t - lastTickRef.current) / 1000;
            lastTickRef.current = t;

            // 각도: 20° → 80° (+2°/클릭), 속도: 100 → 40 (-2/클릭)
            const currentAngleDeg = Math.min(80, 20 + (scoreRef.current * 2));
            const totalSpeed = Math.max(40, 100 - scoreRef.current * 2);
            const angleRad = (currentAngleDeg * Math.PI) / 180;

            const vx = totalSpeed * Math.cos(angleRad);
            const vy = totalSpeed * Math.sin(angleRad);

            distanceRef.current += vx * delta;

            const moveY = directionRef.current === "up" ? -vy : vy;
            arrowYRef.current += moveY * delta;

            const tipOffset = 1.8;

            if (directionRef.current === "up") {
                if (arrowYRef.current - tipOffset <= topBoundaryRef.current) {
                    endGameRef.current();
                    return;
                }
            } else {
                if (arrowYRef.current + tipOffset >= bottomBoundaryRef.current) {
                    endGameRef.current();
                    return;
                }
            }

            // 트레일 업데이트
            trailRef.current.unshift({ d: distanceRef.current, y: arrowYRef.current });
            if (trailRef.current.length > 100) trailRef.current.pop();

            setDistance(distanceRef.current);
            setArrowY(arrowYRef.current);
            gameLoopRef.current = requestAnimationFrame(tick);
        };

        gameLoopRef.current = requestAnimationFrame(tick);
    }, []);

    const endGame = useCallback(() => {
        if (!isPlayingRef.current) return;
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        setPhase("result");
        isPlayingRef.current = false;
        setFinalScore(scoreRef.current);

        restartTimerRef.current = setTimeout(() => {
            setShowRestartMessage(true);
        }, 300);

        if (userName !== "비회원") {
            fetch("/api/arrow-scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: scoreRef.current }),
            }).then(() => loadRanking()).catch(console.error);
        }
    }, [userName, loadRanking]);

    // endGame이 업데이트될 때마다 ref도 동기화
    useEffect(() => {
        endGameRef.current = endGame;
    }, [endGame]);

    const handleClick = useCallback(() => {
        if (phase === "idle" || (phase === "result" && showRestartMessage)) {
            startGame();
        } else if (phase === "playing") {
            const currentY = arrowYRef.current;
            const prevDir = directionRef.current;
            const tipOffset = 1.8;

            // 경계선 업데이트 (state + ref 동기화)
            if (prevDir === "up") {
                const newBoundary = currentY - tipOffset;
                setTopBoundary(newBoundary);
                topBoundaryRef.current = newBoundary;
                setBoundaryHistory(prev => [...prev, { y: newBoundary, type: 'top' }]);
            } else {
                const newBoundary = currentY + tipOffset;
                setBottomBoundary(newBoundary);
                bottomBoundaryRef.current = newBoundary;
                setBoundaryHistory(prev => [...prev, { y: newBoundary, type: 'bottom' }]);
            }

            directionRef.current = prevDir === "up" ? "down" : "up";
            scoreRef.current += 1;
            setScore(scoreRef.current);

            // 시각적 피드백 (DOM 직접 조작 → 리렌더 없음)
            if (characterRef.current) {
                characterRef.current.style.transform = 'translate(-50%, -50%) scale(1.5)';
                if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
                pulseTimerRef.current = setTimeout(() => {
                    if (characterRef.current) {
                        characterRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
                    }
                }, 120);
            }
        }
    }, [phase, showRestartMessage, startGame]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space" || e.code === "Enter") {
                if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
                e.preventDefault();
                handleClick();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleClick]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto select-none">
            {/* Mobile HTP */}
            <div className="order-1 lg:hidden">
                <HTPSection />
            </div>

            {/* Game Main Area */}
            <div
                className="order-2 lg:flex-1 min-w-0 min-h-[500px] bg-card border border-border/60 rounded-2xl relative overflow-hidden shadow-sm cursor-pointer"
                onPointerDown={handleClick}
            >
                {/* Game Board (Full Stretch via absolute fill) */}
                <div ref={containerRef} className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-[#020617] dark:via-[#020617] dark:to-[#0a0f2e] overflow-hidden">

                    {/* Parallax Background */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-[0.08] dark:opacity-20"
                        style={{
                            backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1.5px, transparent 1.5px)',
                            backgroundSize: '40px 40px',
                            backgroundPositionX: `${-distance * 1.2}px`,
                        }}
                    />

                    {/* Trail SVG */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                        <polyline
                            points={trailRef.current.map(p => {
                                const hW = containerRef.current?.clientWidth ?? 0;
                                const hH = containerRef.current?.clientHeight ?? 0;
                                const x = 0.25 * hW - (distance - p.d) * (hW / 100);
                                const y = (p.y / 100) * hH;
                                return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="opacity-20"
                        />
                    </svg>

                    {/* Boundary Trailing History */}
                    {boundaryHistory.map((b, i) => (
                        <div
                            key={i}
                            className={`absolute w-full h-[3px] bg-destructive z-10 pointer-events-none 
                                ${b.type === 'top'
                                    ? "shadow-[0_5px_15px_rgba(239,68,68,0.15)] dark:shadow-[0_5px_15px_rgba(239,68,68,0.3)]"
                                    : "shadow-[0_-5px_15px_rgba(239,68,68,0.15)] dark:shadow-[0_-5px_15px_rgba(239,68,68,0.3)]"
                                }`}
                            style={{
                                top: `${b.y}%`,
                                transform: b.type === 'top' ? 'translateY(0)' : 'translateY(-100%)',
                            }}
                        />
                    ))}

                    {/* Active Boundaries */}
                    <div
                        className="absolute w-full h-[3px] bg-destructive shadow-[0_5px_15px_rgba(239,68,68,0.15)] dark:shadow-[0_5px_15px_rgba(239,68,68,0.3)] z-20 pointer-events-none"
                        style={{ top: `${topBoundary}%`, transform: 'translateY(0)' }}
                    />
                    <div
                        className="absolute w-full h-[3px] bg-destructive shadow-[0_-5px_15px_rgba(239,68,68,0.15)] dark:shadow-[0_-5px_15px_rgba(239,68,68,0.3)] z-20 pointer-events-none"
                        style={{ top: `${bottomBoundary}%`, transform: 'translateY(-100%)' }}
                    />

                    {/* Character */}
                    <div
                        ref={characterRef}
                        className="absolute z-30"
                        style={{
                            left: `25%`,
                            top: `${arrowY}%`,
                            transform: `translate(-50%, -50%)`,
                            transition: 'transform 120ms ease-out',
                        }}
                    >
                        <CoreSVG color="hsl(var(--primary))" />
                    </div>

                    {/* Middle Line Guide */}
                    <div className="absolute inset-x-0 h-px bg-primary/5 border-t border-dashed border-primary/10" style={{ top: '50%' }} />

                    {/* HUD: Score (Minimalist In-Game, Centered background) */}
                    {phase === "playing" && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 text-center pointer-events-none">
                            <div className="text-[10rem] md:text-[20rem] font-black tabular-nums tracking-tighter text-foreground/[0.08] dark:text-foreground/[0.12] select-none leading-none">
                                {score}
                            </div>
                        </div>
                    )}

                    {/* OVERLAYS */}

                    {/* 1. Idle State */}
                    {phase === "idle" && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/30 dark:bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-700">
                            <div className="text-center space-y-4">
                                <div className="text-foreground dark:text-white font-black text-3xl tracking-[0.3em] opacity-90 uppercase animate-pulse">READY</div>
                            </div>
                        </div>
                    )}

                    {/* 2. Result State */}
                    {phase === "result" && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/85 dark:bg-black/80 backdrop-blur-[12px] animate-in fade-in duration-500">
                            <div className="text-center animate-in zoom-in-95 duration-500 pointer-events-none">
                                <div className="text-[12rem] md:text-[18rem] font-black leading-none tracking-tighter text-foreground dark:text-white drop-shadow-[0_0_50px_hsl(var(--primary)/0.15)]">
                                    {finalScore}
                                </div>
                                <div className="mt-16 animate-pulse text-primary/40 font-bold text-[10px] tracking-[0.5em] uppercase">
                                    {showRestartMessage ? "CLICK TO RESTART" : "WAITING..."}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Ambient Flare */}
                {phase === 'playing' && (
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.05),transparent)] z-0" />
                )}
            </div>

            {/* Sidebar */}
            <div className="order-3 lg:w-64 shrink-0 flex flex-col gap-4">
                <div className="hidden lg:block">
                    <HTPSection />
                </div>
                <RankingBoard
                    ranking={ranking}
                    onShowAll={() => setShowAllRanking(true)}
                    isGuest={userName === "비회원"}
                />
            </div>

            {/* Global Ranking Modal */}
            {showAllRanking && (
                <Portal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAllRanking(false)}>
                        <div className="w-full max-w-sm mx-4 bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2 px-6 py-5 border-b border-border/50">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                <h3 className="font-black text-sm uppercase flex-1 tracking-wider text-foreground">전체 랭킹</h3>
                                <button onClick={() => setShowAllRanking(false)} className="p-1 hover:bg-muted rounded-lg transition-colors leading-none"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-4 max-h-[60vh] overflow-y-auto font-sans">
                                {ranking.length === 0 ? (
                                    <p className="text-center py-10 text-muted-foreground text-sm">아직 기록이 없어요.</p>
                                ) : (
                                    <ol className="space-y-2">
                                        {ranking.map((entry, i) => (
                                            <li key={i} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${i < 3 ? "bg-primary/5 border border-primary/10 shadow-sm" : "bg-muted/30"}`}>
                                                <span className="w-8 text-center font-black text-lg italic text-muted-foreground font-sans">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
                                                <span className="flex-1 truncate text-sm font-bold text-foreground">{entry.user_name}</span>
                                                <span className="font-black text-primary tabular-nums text-base">{entry.score}회</span>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                            <div className="p-5 border-t border-border/50 bg-muted/20">
                                {(() => {
                                    const myRankIndex = ranking.findIndex(r => r.user_name === userName);
                                    const myBestScore = myRankIndex !== -1 ? ranking[myRankIndex].score : undefined;
                                    const displayScore = myBestScore !== undefined && myBestScore > 0 ? `${myBestScore}회` : undefined;
                                    const myRank = displayScore !== undefined ? myRankIndex + 1 : null;
                                    return (
                                        <KakaoShareButton
                                            userName={userName}
                                            gameTitle={title!}
                                            gameUrl="/works/arrow-game"
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
            {/* Global Styles for Animations */}
            <style jsx global>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                @keyframes ping {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

function CoreSVG({ color }: { color: string }) {
    return (
        <div className="relative w-8 h-8 flex items-center justify-center">
            {/* 외곽 펄스 링 */}
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
            {/* 중간 글로우 링 */}
            <div className="absolute w-5 h-5 rounded-full bg-primary/10 dark:bg-primary/15 blur-[3px]" />
            {/* 외곽 링 */}
            <div className="w-3.5 h-3.5 rounded-full border-[2px] border-primary/60 dark:border-primary/80 flex items-center justify-center shadow-[0_0_12px_hsl(var(--primary)/0.3)]">
                {/* 내부 코어 */}
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
            </div>
        </div>
    );
}

function HTPSection() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="p-4 rounded-2xl border border-border bg-card/50 shadow-sm">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 w-full transition-colors">
                <span className="text-amber-500">💡</span>
                <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase flex-1 text-left">How to Play</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <ul className="space-y-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-1 duration-200 font-medium font-sans">
                    <li className="flex gap-3">
                        <span className="text-primary font-bold shrink-0 leading-none">01</span>
                        <span><strong>클릭하면 진행 방향이 반전돼요. <br />PC로는 스페이스바로도 가능해요.</strong></span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-primary font-bold shrink-0 leading-none">02</span>
                        <span><strong>방향을 꺾으면 새로운 경계선이 쌓여요.</strong></span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-primary font-bold shrink-0 leading-none">03</span>
                        <span><strong>빨간 선에 닿으면 게임이 종료돼요.</strong></span>
                    </li>
                </ul>
            )}
        </div>
    );
}

function RankingBoard({ ranking, onShowAll, isGuest }: { ranking: RankEntry[], onShowAll: () => void, isGuest: boolean }) {
    return (
        <div className={`rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 relative overflow-hidden ${isGuest ? "min-h-[200px]" : ""}`}>
            <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-sm tracking-wide text-foreground uppercase flex-1">TOP 3</h2>
                {ranking.length > 0 && !isGuest && <button onClick={onShowAll} className="text-[10px] font-bold text-primary hover:text-primary/80 hover:underline transition-colors">전체보기</button>}
            </div>

            <div className={isGuest ? "filter blur-[3px] select-none pointer-events-none opacity-40" : ""}>
                {ranking.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">아직 기록이 없어요</p> : (
                    <ol className="space-y-2">
                        {ranking.slice(0, 3).map((entry, i) => (
                            <li key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${i === 0 ? "bg-yellow-400/10 border border-yellow-400/25" : i === 1 ? "bg-slate-400/10 border border-slate-400/20" : "bg-orange-400/10 border border-orange-400/20"}`}>
                                <span className="text-base shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                                <div className="flex-1 min-w-0 font-sans"><p className="text-sm font-semibold truncate text-foreground">{entry.user_name}</p></div>
                                <span className="text-sm font-black text-primary tabular-nums">{entry.score}회</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>

            {isGuest && (
                <div className="absolute inset-0 top-[44px] flex flex-col items-center justify-center bg-card/10 backdrop-blur-[1px] z-10 p-4 text-center">
                    <div className="p-2 rounded-full bg-primary/10 mb-2">
                        <Lock className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[11px] font-bold text-foreground mb-1 leading-tight text-balance">조회 권한이 없어요.</p>
                    <button
                        onClick={() => window.location.href = '/auth/login'}
                        className="text-[10px] font-black text-primary hover:underline mt-1"
                    >
                        로그인하기
                    </button>
                </div>
            )}
        </div>
    );
}
