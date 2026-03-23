"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ProjectProps } from "@/components/project-registry";
import { Trophy, X, ChevronDown, Lock } from "lucide-react";
import { KakaoShareButton } from "@/components/kakao-share-button";
import { Portal } from "@/components/portal";
import { Button } from "@/components/ui/button";

// ─── 색상 상수 (파/남/보 구분 강화) ──────────────────────────
const COLORS = [
    { id: "red", name: "빨강", bg: "bg-red-500", shadow: "shadow-red-500/40", hex: "#ef4444" },
    { id: "orange", name: "주황", bg: "bg-orange-500", shadow: "shadow-orange-500/40", hex: "#f97316" },
    { id: "yellow", name: "노랑", bg: "bg-yellow-400", shadow: "shadow-yellow-400/40", hex: "#facc15" },
    { id: "green", name: "초록", bg: "bg-emerald-500", shadow: "shadow-emerald-500/40", hex: "#10b981" },
    { id: "blue", name: "파랑", bg: "bg-sky-400", shadow: "shadow-sky-400/40", hex: "#38bdf8" },   // 연한 하늘색
    { id: "indigo", name: "남색", bg: "bg-blue-800", shadow: "shadow-blue-800/40", hex: "#1e40af" },   // 진한 남색
    { id: "violet", name: "보라", bg: "bg-fuchsia-500", shadow: "shadow-fuchsia-500/40", hex: "#d946ef" },   // 밝은 보라/핑크
];

type GamePhase = "idle" | "playing" | "result";

interface RankEntry {
    user_name: string;
    score: number;
    created_at: string;
}

interface BalloonCell {
    id: number;
    colorIndex: number;
    popped: boolean;
    popEffect: boolean;
}

const TIME_LIMIT = 10;
const GRID_SIZE = 5;
const GRID_TOTAL = GRID_SIZE * GRID_SIZE; // 25
const MAX_PER_COLOR = 7;

// ─── 그리드 생성 함수 (순수) ─────────────────────────────────
function createGrid(): BalloonCell[] {
    const distribution: number[] = [];

    // 최소 1개씩 보장 (7색 × 1 = 7)
    COLORS.forEach((_, i) => { distribution.push(i); });

    // 나머지 18칸 (최대 7개 제한)
    const counts = Array(COLORS.length).fill(1);
    while (distribution.length < GRID_TOTAL) {
        const c = Math.floor(Math.random() * COLORS.length);
        if (counts[c] < MAX_PER_COLOR) { distribution.push(c); counts[c]++; }
    }

    // Fisher-Yates 셔플
    for (let i = distribution.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [distribution[i], distribution[j]] = [distribution[j], distribution[i]];
    }

    return distribution.map((colorIndex, id) => ({ id, colorIndex, popped: false, popEffect: false }));
}

// ─── 풍선 렌더링 최적화 컴포넌트 ─────────────────────────────────
const Balloon = React.memo(({
    cell,
    phase,
    onPop
}: {
    cell: BalloonCell,
    phase: GamePhase,
    onPop: (id: number, colorIdx: number) => void
}) => {
    return (
        <div className="relative aspect-square">
            {cell.popEffect && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className={`absolute w-2 h-2 rounded-full ${COLORS[cell.colorIndex].bg}`}
                            style={{
                                top: '50%', left: '50%',
                                animation: `pop-particle-${i} 0.4s ease-out forwards`,
                            }}
                        />
                    ))}
                    <div className="absolute inset-0 rounded-full bg-white/80 animate-ping" style={{ animationDuration: '0.3s' }} />
                </div>
            )}
            <button
                disabled={cell.popped || phase !== "playing"}
                onClick={() => onPop(cell.id, cell.colorIndex)}
                className={`relative w-full h-full transition-all duration-300
            ${cell.popped ? "scale-0 opacity-0 pointer-events-none" : cell.popEffect ? "scale-125 opacity-0" : "scale-100 opacity-100 hover:scale-110 active:scale-75"}`}
            >
                {/* 풍선 몸체 (타원) */}
                <div
                    className={`w-full h-[88%] rounded-[50%_50%_45%_45%] shadow-lg
                ${COLORS[cell.colorIndex].bg} ${COLORS[cell.colorIndex].shadow}
                relative transition-all`}
                >
                    {/* 반사광 */}
                    <div className="absolute top-[12%] left-[18%] w-[28%] h-[18%] bg-white/40 rounded-full blur-[1px]" />
                </div>
                {/* 매듭 */}
                <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[18%] h-[12%] ${COLORS[cell.colorIndex].bg} brightness-75`}
                    style={{ clipPath: "polygon(50% 0%, 20% 100%, 80% 100%)" }}
                />
            </button>
        </div>
    );
});
Balloon.displayName = "Balloon";

export function BalloonGame({ userName, title }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
    const [grid, setGrid] = useState<BalloonCell[]>([]);
    const [currentColorIndex, setCurrentColorIndex] = useState(-1);
    const [bonusAnim, setBonusAnim] = useState<number>(0);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [showAllRanking, setShowAllRanking] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [gameOverReason, setGameOverReason] = useState<"wrong_color" | "timeout" | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const endTimeRef = useRef<number>(0);
    const scoreRef = useRef(0);
    const isPlayingRef = useRef(false);
    const endGameRef = useRef<(reason: "wrong_color" | "timeout") => void>(() => { });

    // ─── 랭킹 ───────────────────────────────────────────────
    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/balloon-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    // ─── 게임 시작 ──────────────────────────────────────────
    const startGame = useCallback(() => {
        setGrid(createGrid());
        setPhase("playing");
        setScore(0);
        scoreRef.current = 0;
        setTimeLeft(TIME_LIMIT);
        setCurrentColorIndex(-1);
        setBonusAnim(0);
        setGameOverReason(null);
        isPlayingRef.current = true;

        endTimeRef.current = Date.now() + TIME_LIMIT * 1000;

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            const now = Date.now();
            const remaining = (endTimeRef.current - now) / 1000;
            if (remaining <= 0) {
                endGameRef.current("timeout");
                setTimeLeft(0);
            } else {
                setTimeLeft(Number(remaining.toFixed(1)));
            }
        }, 100);
    }, []);

    // ─── 게임 종료 ──────────────────────────────────────────
    const endGame = useCallback(async (reason: "wrong_color" | "timeout") => {
        if (!isPlayingRef.current) return;
        isPlayingRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);

        const fs = scoreRef.current;
        setFinalScore(fs);
        setPhase("result");
        setGameOverReason(reason);

        if (fs > 0 && userName !== "비회원") {
            try {
                await fetch("/api/balloon-scores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ score: fs }),
                });
                loadRanking();
            } catch { }
        }
    }, [userName, loadRanking]);

    // endGame ref 최신 유지
    useEffect(() => { endGameRef.current = endGame; }, [endGame]);

    // 언마운트 시 타이머 정리
    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    // 보너스 점수 애니메이션 타이머
    useEffect(() => {
        if (bonusAnim > 0) {
            const timer = setTimeout(() => setBonusAnim(0), 1200);
            return () => clearTimeout(timer);
        }
    }, [bonusAnim]);

    // ─── 풍선 클릭 ──────────────────────────────────────────
    const handlePop = useCallback((id: number, colorIdx: number) => {
        if (phase !== "playing") return;

        const isCorrectColor = (colorIdx === currentColorIndex) || (colorIdx === currentColorIndex + 1);
        if (!isCorrectColor) { endGame("wrong_color"); return; }

        // 먼저 이펙트 표시
        setGrid((prev) => {
            const target = prev[id];
            if (target.popped) return prev;
            const next = [...prev];
            next[id] = { ...target, popEffect: true };
            return next;
        });

        // 짧은 딜레이 후 실제로 제거
        setTimeout(() => {
            setGrid((prev) => {
                // 이전 보드에서 등록된 setTimeout 이 새 보드(newGrid) 생성 이후에 실행되는 것을 방지
                if (!prev[id] || !prev[id].popEffect) return prev;

                const next = [...prev];
                next[id] = { ...next[id], popped: true, popEffect: false };

                // 게임이 끝난 상태라면 상태 정리(popEffect 제거)만 하고 부가 로직(보너스, 새판 등)은 생략
                if (!isPlayingRef.current) return next;

                // 보라색(마지막 색) 풍선이 모두 터졌는지 확인
                const violetIndex = COLORS.length - 1;
                const hasRemainingViolet = next.some(c => c.colorIndex === violetIndex && !c.popped);
                if (!hasRemainingViolet) {
                    // 모든 풍선을(25개) 전부 터뜨렸는지 확인
                    const isAllPopped = next.every(c => c.popped);
                    if (isAllPopped) {
                        setTimeout(() => {
                            endTimeRef.current += 2000;
                            const remaining = (endTimeRef.current - Date.now()) / 1000;
                            setTimeLeft(remaining);
                            setBonusAnim(Date.now());
                        }, 0);
                    }

                    // 모든 보라 풍선이 터짐 → 새 판 생성, 빨강부터 다시
                    const newGrid = createGrid();
                    setCurrentColorIndex(-1);
                    return newGrid;
                }

                return next;
            });
        }, 200);

        setScore((prev) => { const ns = prev + 1; scoreRef.current = ns; return ns; });

        if (colorIdx === currentColorIndex + 1) setCurrentColorIndex(colorIdx);
    }, [phase, currentColorIndex, endGame]);

    // ─── 단축키 ─────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.code === "Space" || e.code === "Enter") && (phase === "idle" || phase === "result")) {
                e.preventDefault();
                startGame();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [phase, startGame]);

    // ─── 타이머 계산 ────────────────────────────────────────
    const progressPct = (timeLeft / TIME_LIMIT) * 100;
    const timerColor = timeLeft <= 3 ? "#ef4444" : "#34d399";
    const timerTextCls = timeLeft <= 3 ? "text-red-500" : "text-emerald-400";

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
                {/* 모바일: HTP 먼저 */}
                <div className="order-1 lg:hidden">
                    <HTPSection />
                </div>

                {/* 메인 게임 영역 */}
                <div className="order-2 lg:flex-1 min-w-0">
                    <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
                        <div className="flex flex-col p-4 md:p-6 gap-4 md:gap-5">

                            {/* 상단 정보 */}
                            <div className="min-h-[100px] flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    {/* 왼쪽 균형 요소 */}
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full opacity-0 pointer-events-none">
                                        <span className="text-[10px]">SCORE</span>
                                        <span className="text-lg">0</span>
                                    </div>
                                    {/* 점수 */}
                                    <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 border border-primary/20">
                                        <span className="text-[10px] md:text-xs text-muted-foreground font-medium">SCORE</span>
                                        <span className="text-lg md:text-2xl font-black text-primary tabular-nums">{phase === "result" ? finalScore : score}</span>
                                    </div>
                                </div>

                                {/* 타이머 바 */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center relative">
                                        <span className="text-[10px] text-muted-foreground font-medium">TIME</span>
                                        <div className="relative flex items-center">
                                            {bonusAnim > 0 && (
                                                <span
                                                    key={bonusAnim}
                                                    className="absolute right-full mr-2 text-sm font-black text-emerald-500 drop-shadow-md animate-in slide-in-from-bottom-2 fade-in duration-300"
                                                >
                                                    +2.0s
                                                </span>
                                            )}
                                            <span className={`text-sm font-black tabular-nums transition-colors ${phase === "playing" ? timerTextCls : "text-muted-foreground"}`}>
                                                {phase === "playing" ? `${timeLeft.toFixed(1)}s` : `${TIME_LIMIT.toFixed(1)}s`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: phase === "playing" ? `${Math.min(100, progressPct)}%` : "100%",
                                                backgroundColor: phase === "playing" ? timerColor : "#cbd5e1",
                                                transition: "width 100ms linear, background-color 0.3s",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 중앙 메시지 */}
                            <div className="text-center h-8 flex flex-col items-center justify-center transition-all duration-300">
                                {phase === "idle" && (
                                    <p className="text-sm font-medium text-muted-foreground">빨간 풍선부터 터뜨려 보세요!</p>
                                )}
                                {phase === "playing" && score > 0 && grid.length > 0 && grid.every(c => !c.popped) && (
                                    <p className="text-[15px] font-black text-red-500 animate-in zoom-in-95 fade-in duration-300">다시 빨간색부터~</p>
                                )}
                                {phase === "result" && gameOverReason === "wrong_color" && (
                                    <p className="text-sm font-bold text-destructive animate-in fade-in duration-200">무지개 몰라?</p>
                                )}
                                {phase === "result" && gameOverReason === "timeout" && (
                                    <p className="text-sm font-bold text-orange-500 animate-in fade-in duration-200">아쉽지만 여기까지~</p>
                                )}
                            </div>

                            {/* idle: 색상 순서 미리보기 / playing+result: 게임 그리드 */}
                            {phase === "idle" ? (
                                <div className="flex w-full justify-center items-center py-2 relative">
                                    <div className="grid grid-cols-5 gap-2 sm:gap-3 w-full max-w-[480px] aspect-square">
                                        {COLORS.flatMap((color, ci) => {
                                            const count = ci % 2 === 0 ? 4 : 3; // 4-3-4-3-4-3-4 = 25
                                            return Array.from({ length: count }, () => color);
                                        }).map((color, idx) => (
                                            <div key={`preview-${idx}`} className="relative aspect-square">
                                                <div className="relative w-full h-full scale-100 opacity-100 transition-all duration-300">
                                                    {/* 풍선 몸체 (타원) */}
                                                    <div className={`w-full h-[88%] rounded-[50%_50%_45%_45%] shadow-lg ${color.bg} ${color.shadow} relative transition-all`}>
                                                        {/* 반사광 */}
                                                        <div className="absolute top-[12%] left-[18%] w-[28%] h-[18%] bg-white/40 rounded-full blur-[1px]" />
                                                    </div>
                                                    {/* 매듭 */}
                                                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[18%] h-[12%] ${color.bg} brightness-75`} style={{ clipPath: "polygon(50% 0%, 20% 100%, 80% 100%)" }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* 5×5 풍선 그리드 */}
                                    <div className="flex w-full justify-center items-center py-2 relative">
                                        <div className={`grid grid-cols-5 gap-2 sm:gap-3 w-full max-w-[480px] aspect-square select-none ${phase === "playing" ? "touch-none" : ""}`}>
                                            {grid.map((cell) => (
                                                <Balloon
                                                    key={cell.id}
                                                    cell={cell}
                                                    phase={phase}
                                                    onPop={handlePop}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* 하단 컨트롤 */}
                            <div className="min-h-[48px] flex items-center justify-center">
                                {(phase === "idle" || phase === "result") && (
                                    <div className="w-full animate-in zoom-in duration-300">
                                        <Button
                                            variant="default"
                                            onClick={startGame}
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
                                    <div className="w-full animate-in fade-in duration-200">
                                        <Button
                                            variant="outline"
                                            onClick={() => endGame("timeout")}
                                            className="w-full font-bold h-12 text-md transition-all text-muted-foreground hover:text-destructive hover:border-destructive/50"
                                        >
                                            그만하기
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 사이드바 */}
                <div className="order-3 lg:w-64 shrink-0 flex flex-col gap-4">
                    <div className="hidden lg:block">
                        <HTPSection />
                    </div>
                    <RankingBoard ranking={ranking} onShowAll={() => setShowAllRanking(true)} isGuest={userName === "비회원"} />
                </div>
            </div>

            {/* 전체 랭킹 모달 */}
            {showAllRanking && (
                <Portal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAllRanking(false)}>
                        <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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
                                            <span className="text-sm font-black text-primary shrink-0">{entry.score}개</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <div className="p-4 border-t border-border bg-muted/20">
                                {(() => {
                                    const myRankIndex = ranking.findIndex((r) => r.user_name === userName);
                                    const myBestScore = myRankIndex !== -1 ? ranking[myRankIndex].score : undefined;
                                    const displayScore = myBestScore !== undefined && myBestScore > 0 ? `${myBestScore}개` : undefined;
                                    const myRank = displayScore !== undefined ? myRankIndex + 1 : null;
                                    return (
                                        <KakaoShareButton
                                            userName={userName}
                                            gameTitle={title!}
                                            gameUrl="/works/balloon-game"
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
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 w-full transition-colors">
                <span className="text-amber-500">💡</span>
                <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase flex-1 text-left">How to Play</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <ul className="space-y-2.5 text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">01</span>
                        <span><strong>빨간색 풍선부터</strong> 시작해서 <strong>10초</strong> 안에 최대한 많은 풍선을 터뜨리세요.</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">02</span>
                        <span>다음 풍선은 <strong>같은 색 또는 무지개 다음 색</strong> 풍선을 터뜨려야 해요. <br />ex) 빨강 → 빨강 또는 주황, 초록 → 초록 또는 파랑</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">03</span>
                        <span><strong>보라색 풍선</strong>을 모두 터뜨리면 새로운 판이 형성돼요. 25개의 풍선을 모두 터뜨리면 <strong>2초</strong>가 추가돼요.</span>
                    </li>
                </ul>
            )}
        </div>
    );
}

function RankingBoard({ ranking, onShowAll, isGuest }: { ranking: RankEntry[], onShowAll: () => void, isGuest: boolean }) {
    return (
        <div className={`rounded-2xl border border-border bg-card p-5 space-y-4 relative overflow-hidden ${isGuest ? "min-h-[200px]" : ""}`}>
            <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-sm tracking-wide text-foreground uppercase flex-1">TOP 3</h2>
                {ranking.length > 0 && !isGuest && (
                    <button onClick={onShowAll} className="text-[10px] font-bold text-primary hover:text-primary/80 hover:underline transition-colors">
                        전체보기
                    </button>
                )}
            </div>

            <div className={isGuest ? "filter blur-[3px] select-none pointer-events-none opacity-40" : ""}>
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
                                <span className="text-sm font-black text-primary shrink-0">{entry.score}개</span>
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
