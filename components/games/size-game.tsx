"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Trophy, AlertCircle, Sparkles, X, ChevronDown } from "lucide-react";
import type { ProjectProps } from "@/components/project-registry";
import { Button } from "@/components/ui/button";

// ─── 도형: 꼭짓점 수 (0 = 원) ───────────────────────────────
const SHAPE_SIDES = [0, 3, 4, 5, 6, 8, 10, 12, 15, 17, 20];

// ─── 게임 상태 ───────────────────────────────────────────────
type GamePhase = "idle" | "playing" | "result" | "gameover";

interface ShapeInfo {
    id: 0 | 1;     // 왼쪽=0, 오른쪽=1
    sides: number; // 꼭짓점 수 (0=원)
    size: number;  // circumradius(px)
}

// ─── 랭킹 ────────────────────────────────────────────────────
interface RankEntry {
    user_name: string;
    score: number;
    created_at: string;
}

// ─── 다각형 꼭짓점 계산 ──────────────────────────────────────
function polygonPoints(cx: number, cy: number, n: number, r: number): string {
    return Array.from({ length: n }, (_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");
}

// ─── SVG 도형 컴포넌트 ──────────────────────────────────────
const BOX = 140;
const CX = BOX / 2;
const CY = BOX / 2;

function ShapeSVG({
    sides,
    size,
    state,
    strokeColor,
    fillColor,
}: {
    sides: number;
    size: number;
    state: "idle" | "correct" | "wrong" | "timeout";
    strokeColor?: string;
    fillColor?: string;
}) {
    const defaultFill =
        state === "correct" ? "rgba(16,185,129,0.2)"
            : state === "wrong" ? "rgba(239,68,68,0.2)"
                : state === "timeout" ? "rgba(251,146,60,0.15)"
                    : "rgba(99,102,241,0.08)";

    const defaultStroke =
        state === "correct" ? "#10b981"
            : state === "wrong" ? "#ef4444"
                : state === "timeout" ? "#fb923c"
                    : "currentColor";

    const fill = fillColor || defaultFill;
    const stroke = strokeColor || defaultStroke;
    const sw = state !== "idle" ? 3 : 2;

    if (sides === 0) {
        return <circle cx={CX} cy={CY} r={size} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
    return <polygon points={polygonPoints(CX, CY, sides, size)} fill={fill} stroke={stroke} strokeWidth={sw} />;
}

// ─── 라운드 생성 ─────────────────────────────────────────────
function generateRound(round: number): {
    left: ShapeInfo;
    right: ShapeInfo;
    timeLimit: number;
    pickSmaller: boolean; // true=작은것 선택, false=큰것 선택
} {
    const timeLimit = 2; // 고정 2초

    const sides = SHAPE_SIDES[Math.floor(Math.random() * SHAPE_SIDES.length)];
    const baseSize = 30.5 + Math.random() * 29; // 30.5 ~ 59.5 범위의 기준 크기
    const diff = 1; // 고정 1px 차이

    const leftIsLarger = Math.random() < 0.5;
    const leftSize = +(baseSize + (leftIsLarger ? diff / 2 : -diff / 2)).toFixed(2);
    const rightSize = +(baseSize + (leftIsLarger ? -diff / 2 : diff / 2)).toFixed(2);
    const pickSmaller = Math.random() < 0.5;

    return {
        left: { id: 0, sides, size: leftSize },
        right: { id: 1, sides, size: rightSize },
        timeLimit: +timeLimit.toFixed(2),
        pickSmaller,
    };
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────
export function SizeGame({ userName }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [round, setRound] = useState(1);
    const [score, setScore] = useState(0);
    const [left, setLeft] = useState<ShapeInfo | null>(null);
    const [right, setRight] = useState<ShapeInfo | null>(null);
    const [timeLimit, setTimeLimit] = useState(2);
    const [timeLeft, setTimeLeft] = useState(2);
    const [pickSmaller, setPickSmaller] = useState(true);
    const [selectedId, setSelectedId] = useState<0 | 1 | null>(null);
    const [resultType, setResultType] = useState<"correct" | "wrong" | "timeout" | null>(null);
    const [finalScore, setFinalScore] = useState(0);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [showAllRanking, setShowAllRanking] = useState(false);
    const [shake, setShake] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentScoreRef = useRef(0);
    const roundRef = useRef(1);
    const pickSmallerRef = useRef(true); // timeout 핸들러가 stale하지 않도록

    // ─── 랭킹 ──────────────────────────────────────────────
    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/size-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    // ─── 타이머 ────────────────────────────────────────────
    const stopTimer = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }, []);

    const startTimer = useCallback((limit: number) => {
        stopTimer();
        setTimeLeft(limit);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                const next = +(prev - 0.05).toFixed(2);
                if (next <= 0) { stopTimer(); return 0; }
                return next;
            });
        }, 50);
    }, [stopTimer]);

    useEffect(() => {
        if (phase === "playing" && timeLeft <= 0) handleTimeout();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft, phase]);

    useEffect(() => () => {
        stopTimer();
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    }, [stopTimer]);

    // ─── 게임오버 ─────────────────────────────────────────
    const endGame = useCallback(async (latestScore: number) => {
        stopTimer();
        setFinalScore(latestScore);
        setPhase("gameover");

        try {
            if (userName !== "비회원" && latestScore > 0) {
                await fetch("/api/size-scores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ score: latestScore }),
                });
                loadRanking();
            }
        } catch { }
    }, [stopTimer, userName, loadRanking]);

    // ─── 라운드 시작 ──────────────────────────────────────
    const startRound = useCallback((roundNum: number) => {
        const { left: l, right: r, timeLimit: tl, pickSmaller: ps } = generateRound(roundNum);
        setLeft(l);
        setRight(r);
        setTimeLimit(tl);
        setPickSmaller(ps);
        pickSmallerRef.current = ps;
        setSelectedId(null);
        setResultType(null);
        setPhase("playing");
        startTimer(tl);

        // 포커스 잔상 제거 (버튼에서 포커스 해제)
        if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, [startTimer]);

    // ─── 게임 시작 ────────────────────────────────────────
    const handleStart = () => {
        currentScoreRef.current = 0;
        roundRef.current = 1;
        setScore(0);
        setRound(1);
        setFinalScore(0);
        startRound(1);
    };


    // ─── 정답 처리 ────────────────────────────────────────
    const handleCorrect = useCallback(() => {
        stopTimer();
        setResultType("correct");
        setPhase("result");

        const newScore = currentScoreRef.current + 1;
        currentScoreRef.current = newScore;
        setScore(newScore);

        resultTimeoutRef.current = setTimeout(() => {
            const nextRound = roundRef.current + 1;
            roundRef.current = nextRound;
            setRound(nextRound);
            startRound(nextRound);
        }, 600);
    }, [stopTimer, startRound]);

    // ─── 오답 처리 ───────────────────────────────────────
    const handleWrong = useCallback(() => {
        stopTimer();
        setResultType("wrong");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPhase("result");

        resultTimeoutRef.current = setTimeout(() => {
            endGame(currentScoreRef.current);
        }, 900);
    }, [stopTimer, endGame]);

    // ─── 타임아웃 처리 ──────────────────────────────────
    const handleTimeout = useCallback(() => {
        if (phase !== "playing") return;
        stopTimer();
        setResultType("timeout");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPhase("result");

        resultTimeoutRef.current = setTimeout(() => {
            endGame(currentScoreRef.current);
        }, 900);
    }, [phase, stopTimer, endGame]);

    // ─── 도형 클릭 ──────────────────────────────────────
    const handleClick = useCallback((id: 0 | 1) => {
        if (phase !== "playing") return;
        if (!left || !right) return;

        setSelectedId(id);

        // pickSmaller=true 이면 작은 것, false 이면 큰 것
        const smallerId = left.size <= right.size ? 0 : 1;
        const largerId = smallerId === 0 ? 1 : 0;
        const correctId = pickSmallerRef.current ? smallerId : largerId;

        if (id === correctId) {
            handleCorrect();
        } else {
            handleWrong();
        }
    }, [phase, left, right, handleCorrect, handleWrong]);

    // 키보드 지원 (시작/재시작: Space, 선택: 1, 2)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                if (phase === "idle" || phase === "gameover") {
                    e.preventDefault();
                    handleStart();
                }
            } else if (e.key === "1" || e.code === "Digit1" || e.code === "Numpad1") {
                if (phase === "playing") {
                    e.preventDefault();
                    handleClick(0);
                }
            } else if (e.key === "2" || e.code === "Digit2" || e.code === "Numpad2") {
                if (phase === "playing") {
                    e.preventDefault();
                    handleClick(1);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [phase, handleClick]);

    // ─── 진행률 ─────────────────────────────────────────
    const progressPct = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0;
    const timerColor = progressPct > 50 ? "#34d399" : progressPct > 25 ? "#fb923c" : "#ef4444";
    const timerTextCls = progressPct > 50 ? "text-emerald-400" : progressPct > 25 ? "text-orange-400" : "text-red-500";

    // 이번 라운드 실제 정답 ID
    const smallerId = left && right ? (left.size <= right.size ? 0 : 1) : null;
    const largerId = smallerId !== null ? (smallerId === 0 ? 1 : 0) as (0 | 1) : null;
    const correctId = pickSmaller ? smallerId : largerId;

    // ─── 도형 상태 계산 ─────────────────────────────────
    const getShapeState = (id: 0 | 1): "idle" | "correct" | "wrong" | "timeout" => {
        if (phase === "playing") return "idle";
        if (resultType === "timeout") return "timeout";
        if (resultType === "correct") return id === correctId ? "correct" : "idle";
        if (resultType === "wrong") {
            if (selectedId === id) return "wrong";
            if (id === correctId) return "correct";
        }
        return "idle";
    };

    const diffPx = left && right ? +(Math.abs(left.size - right.size)).toFixed(2) : 0;

    // ─── 렌더 ────────────────────────────────────────────
    return (
        <>
            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
                {/* 1. How to Play (모바일 전용 - 가장 상단) */}
                <div className="order-1 lg:hidden">
                    <HTPSection />
                </div>

                {/* 2. 게임 영역 (모바일: 2순위, PC: 왼쪽) */}
                <div className="order-2 lg:flex-1 min-w-0">
                    <div className={`relative rounded-2xl border border-border bg-card overflow-hidden transition-all ${shake ? "animate-shake" : ""}`}>
                        <div className="flex flex-col p-4 md:p-6 gap-4 md:gap-5">

                            {/* 상단 정보 영역 (높이 고정으로 레이아웃 흔들림 방지) */}
                            <div className="min-h-[100px] flex flex-col gap-4">
                                {/* 라운드 + 점수 */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                                        <span className="text-[10px] text-muted-foreground font-medium">ROUND</span>
                                        <span className="text-lg font-black text-foreground tabular-nums">
                                            {phase === "idle" ? 1 : round}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 border border-primary/20">
                                        <span className="text-[10px] md:text-xs text-muted-foreground font-medium">SCORE</span>
                                        <span className="text-lg md:text-2xl font-black text-primary tabular-nums">{score}</span>
                                    </div>
                                </div>

                                {/* 타이머 바 (상시 노출로 통일) */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-muted-foreground font-medium">TIME</span>
                                        <span className={`text-sm font-black tabular-nums ${timerTextCls} transition-colors`}>
                                            {timeLeft.toFixed(2)}s
                                        </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${progressPct}%`,
                                                backgroundColor: timerColor,
                                                transition: "width 50ms linear, background-color 0.3s",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 안내 메시지 */}
                            <div className="text-center min-h-[28px] flex items-center justify-center gap-2">
                                {phase === "idle" && (
                                    <p className="text-sm text-muted-foreground">
                                        제시된 두 도형 중 <span className="font-bold text-foreground">더 작은 것</span> 또는 <span className="font-bold text-foreground">더 큰 것</span>을 골라주세요
                                    </p>
                                )}
                                {phase === "playing" && (
                                    <p className="text-sm text-muted-foreground">
                                        둘 중 <span className={`font-black text-base px-1.5 py-0.5 rounded-md ${pickSmaller
                                            ? "text-blue-500 dark:text-blue-400 bg-blue-500/10"
                                            : "text-rose-500 dark:text-rose-400 bg-rose-500/10"
                                            }`}>{pickSmaller ? "더 작은 것" : "더 큰 것"}</span>을 고르시오
                                    </p>
                                )}
                                {phase === "result" && resultType === "correct" && (
                                    <p className="text-sm font-bold text-emerald-500 animate-in fade-in duration-200">정답입니다! </p>
                                )}
                                {phase === "result" && resultType === "wrong" && (
                                    <p className="text-sm font-bold text-destructive animate-in fade-in duration-200">오답입니다!</p>
                                )}
                                {phase === "result" && resultType === "timeout" && (
                                    <p className="text-sm font-bold text-orange-500 animate-in fade-in duration-200">시간 초과!</p>
                                )}
                                {phase === "gameover" && (
                                    <p className="text-sm text-muted-foreground">
                                        둘 중 <span className={`font-black text-base px-1.5 py-0.5 rounded-md ${pickSmaller
                                            ? "text-blue-500 dark:text-blue-400 bg-blue-500/10"
                                            : "text-rose-500 dark:text-rose-400 bg-rose-500/10"
                                            }`}>{pickSmaller ? "더 작은 것" : "더 큰 것"}</span>을 고르시오
                                    </p>
                                )}
                            </div>

                            {/* 도형 2개 */}
                            <div className="flex w-full gap-3 md:gap-6 justify-center items-center py-6 md:py-8 px-2 sm:px-4">
                                {(phase === "playing" || phase === "result" || phase === "gameover") && left && right ? (
                                    <>
                                        {[left, right].map((shape) => {
                                            const st = getShapeState(shape.id);
                                            const isClickable = phase === "playing";
                                            const num = shape.id + 1;
                                            const color = shape.id === 0 ? "#3b82f6" : "#ef4444";

                                            return (
                                                <button
                                                    key={shape.id}
                                                    onClick={() => handleClick(shape.id)}
                                                    disabled={!isClickable}
                                                    className={`
                                                    relative flex-1 flex flex-col items-center justify-center gap-1 p-3 sm:p-5 md:p-6 rounded-2xl border-2 transition-all duration-200 aspect-square max-w-[180px]
                                                    ${st === "correct"
                                                            ? "border-emerald-500/60 bg-emerald-500/5 shadow-md shadow-emerald-500/10"
                                                            : st === "wrong"
                                                                ? "border-destructive/60 bg-destructive/5"
                                                                : isClickable
                                                                    ? "border-border bg-card [@media(hover:hover)]:hover:border-primary/40 [@media(hover:hover)]:hover:bg-primary/5 cursor-pointer"
                                                                    : "border-border bg-card"
                                                        }
                                                `}
                                                >
                                                    {/* 번호 뱃지 (고정 색상) */}
                                                    <span
                                                        className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm"
                                                        style={{ backgroundColor: color }}
                                                    >
                                                        {num}
                                                    </span>

                                                    <svg viewBox={`0 0 ${BOX} ${BOX}`} className="w-full h-full max-w-[140px]">
                                                        <ShapeSVG
                                                            sides={shape.sides}
                                                            size={shape.size}
                                                            state={st}
                                                            strokeColor={st === "idle" ? color : undefined}
                                                            fillColor={st === "idle" ? `${color}15` : undefined}
                                                        />
                                                        {st === "correct" && (
                                                            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central"
                                                                fontSize="28" opacity="0.5" fill="#10b981">✓</text>
                                                        )}
                                                        {st === "wrong" && (
                                                            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central"
                                                                fontSize="24" opacity="0.4" fill="#ef4444">✗</text>
                                                        )}
                                                    </svg>
                                                </button>
                                            );
                                        })}
                                    </>
                                ) : (
                                    // idle 미리보기 (패딩을 실제 게임 영역과 동일하게 맞춤)
                                    <div className="flex w-full gap-3 md:gap-6 justify-center items-center opacity-20 pointer-events-none py-6 md:py-8 px-2 sm:px-4">
                                        {[30, 60].map((size, i) => (
                                            <div key={i} className="relative flex-1 flex flex-col items-center justify-center gap-1 p-3 sm:p-5 md:p-6 rounded-2xl border-2 border-border bg-card aspect-square max-w-[180px]">
                                                <svg viewBox={`0 0 ${BOX} ${BOX}`} className="w-full h-full max-w-[140px]">
                                                    <circle cx={CX} cy={CY} r={size}
                                                        fill="rgba(99,102,241,0.08)" stroke="currentColor" strokeWidth={2} />
                                                </svg>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 컨트롤 버튼 (높이 고정으로 레이아웃 흔들림 방지) */}
                            <div className="min-h-[48px] flex items-center justify-center">
                                {phase === "idle" && (
                                    <Button
                                        variant="default"
                                        onClick={handleStart}
                                        className="w-full font-bold h-12 text-md transition-all shadow-sm group relative"
                                    >
                                        게임 시작
                                        <span className="hidden sm:inline-flex absolute right-4 items-center gap-1.5 px-1.5 py-0.5 rounded border border-white/30 bg-white/20 text-[10px] font-medium tracking-tight">
                                            Space
                                        </span>
                                    </Button>
                                )}
                                {phase === "gameover" && (
                                    <div className="w-full animate-in zoom-in duration-300">
                                        <Button
                                            variant="default"
                                            onClick={handleStart}
                                            className="w-full font-bold h-12 text-md transition-all shadow-sm group relative"
                                        >
                                            다시 시작
                                            <span className="hidden sm:inline-flex absolute right-4 items-center gap-1.5 px-1.5 py-0.5 rounded border border-white/30 bg-white/20 text-[10px] font-medium tracking-tight">
                                                Space
                                            </span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. 사이드바 (모바일: 3, 4순위, PC: 오른쪽) */}
                <div className="order-3 lg:w-64 shrink-0 flex flex-col gap-4">
                    {/* PC 전용 How to Play (사이드바 최상단) */}
                    <div className="hidden lg:block">
                        <HTPSection />
                    </div>

                    {/* 랭킹 보드 (PC 2순위, 모바일 3순위) */}
                    <RankingBoard
                        ranking={ranking}
                        onShowAll={() => setShowAllRanking(true)}
                        phase={phase}
                        finalScore={finalScore}
                    />

                    {/* 정답/팁 (PC 3순위, 모바일 4순위) */}
                    <AnswerSection
                        isVisible={left !== null && right !== null && (resultType === "wrong" || resultType === "timeout" || phase === "gameover")}
                        left={left}
                        right={right}
                        correctId={correctId}
                        pickSmaller={pickSmaller}
                    />
                </div>
            </div>

            {/* 전체 랭킹 모달 */}
            {showAllRanking && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowAllRanking(false)}
                >
                    <div
                        className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 모달 헤더 */}
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
                        {/* 랭킹 목록 */}
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
                                        <span className="text-sm font-black text-primary shrink-0">{entry.score}점</span>
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

// ─── 서브 컴포넌트 ───────────────────────────────────────────

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
                        <span>매 라운드마다 서로 다른 크기의 도형이 2개 주어져요</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">02</span>
                        <span>제한 시간(2초) 내에 <strong className="text-foreground">더 작은 것</strong> 또는 <strong className="text-foreground">더 큰 것</strong>을 선택하세요</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">03</span>
                        <span>눈 크게 뜨고 잘 보세요</span>
                    </li>
                </ul>
            )}
        </div>
    );
}

function RankingBoard({ ranking, onShowAll, phase, finalScore }: { ranking: RankEntry[], onShowAll: () => void, phase: GamePhase, finalScore: number }) {
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
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${i === 0 ? "bg-yellow-400/10 border border-yellow-400/25"
                                : i === 1 ? "bg-slate-400/10 border border-slate-400/20"
                                    : "bg-orange-400/10 border border-orange-400/20"
                                }`}
                        >
                            <span className="text-base shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{entry.user_name}</p>
                            </div>
                            <span className="text-sm font-black text-primary shrink-0">{entry.score}점</span>
                        </li>
                    ))}
                </ol>
            )}

        </div>
    );
}

function AnswerSection({ isVisible, left, right, correctId, pickSmaller }: { isVisible: boolean, left: ShapeInfo | null, right: ShapeInfo | null, correctId: 0 | 1 | null, pickSmaller: boolean }) {
    if (!isVisible || !left || !right || correctId === null) return null;

    return (
        <div className="p-4 rounded-3xl border border-border bg-card/60 backdrop-blur-sm animate-in zoom-in-95 slide-in-from-top-2 duration-500 shadow-xl shadow-black/5">
            <div className="flex items-center gap-2">
                <span className="text-amber-500">💡</span>
                <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Answer</span>
            </div>

            {/* 포개진 모습 미리보기 */}
            <div className="relative w-full aspect-square max-w-[120px] mx-auto flex items-center justify-center">
                <svg viewBox={`0 0 ${BOX} ${BOX}`} className="w-full h-full drop-shadow-md">
                    {/* 2번 (빨강) */}
                    <g style={{ color: '#ef4444' }}>
                        <ShapeSVG
                            sides={right.sides}
                            size={right.size}
                            state="idle"
                            strokeColor="currentColor"
                            fillColor="rgba(239, 68, 68, 0.1)"
                        />
                    </g>
                    {/* 1번 (파랑 - 점선) */}
                    <g style={{ color: '#3b82f6' }}>
                        <path
                            d={left.sides === 0
                                ? `M ${CX} ${CY - left.size} A ${left.size} ${left.size} 0 1 1 ${CX} ${CY + left.size} A ${left.size} ${left.size} 0 1 1 ${CX} ${CY - left.size}`
                                : `M ${polygonPoints(CX, CY, left.sides, left.size).replace(/,/g, ' ')} Z`}
                            fill="rgba(59, 130, 246, 0.1)"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray="4 3"
                        />
                    </g>
                </svg>
            </div>

            <div className="text-center">
                <p className="text-lg font-black text-foreground">
                    <span style={{ color: correctId === 0 ? '#3b82f6' : '#ef4444' }}>{correctId + 1}번</span>이 더 {pickSmaller ? "작습니다" : "큽니다"}!
                </p>
            </div>
        </div>
    );
}

