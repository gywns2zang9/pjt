"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trophy, X, ChevronDown, Lock } from "lucide-react";
import { type ProjectProps } from "@/components/project-registry";
import { Button } from "@/components/ui/button";
import { KakaoShareButton } from "@/components/kakao-share-button";
import { Portal } from "@/components/portal";

type GamePhase = "idle" | "playing" | "inputting" | "result" | "gameover";

interface RankEntry {
    user_name: string;
    score: number;
}

interface DdongSpot {
    pos: number;
}

export function DdongGame({ userName, title }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(1);

    // 전체 시퀀스 및 현재 표출 중인 인덱스
    const [sequence, setSequence] = useState<DdongSpot[]>([]);

    // 보여주기 페이즈 (playing) 상태
    const [activeHole, setActiveHole] = useState<number | null>(null);

    // 입력 페이즈 (inputting) 상태
    const [inputIndex, setInputIndex] = useState(0);

    const [timeLeft, setTimeLeft] = useState(30);
    const TIME_LIMIT = 30;

    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [showAllRanking, setShowAllRanking] = useState(false);
    const [shake, setShake] = useState(false);
    const [resultType, setResultType] = useState<"correct" | "wrong" | "timeout" | null>(null);

    const scoreRef = useRef(0);
    const phaseRef = useRef<GamePhase>("idle");
    const isCancelledRef = useRef(false);
    const mainTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 짧은 피드백(잔상)을 위한 상태
    const [clickedFeedbackHole, setClickedFeedbackHole] = useState<number | null>(null);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    // ─── Ranking ──────────────────────────────────────────
    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/ddong-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    const saveScore = useCallback(async (finalVal: number) => {
        if (userName === "비회원" || finalVal <= 0) return;
        try {
            await fetch("/api/ddong-scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: finalVal }),
            });
            loadRanking();
        } catch { }
    }, [userName, loadRanking]);

    // ─── Timers ───────────────────────────────────────────
    const stopMainTimer = useCallback(() => {
        if (mainTimerRef.current) {
            clearInterval(mainTimerRef.current);
            mainTimerRef.current = null;
        }
    }, []);

    const startMainTimer = useCallback(() => {
        stopMainTimer();
        setTimeLeft(TIME_LIMIT);
        mainTimerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                const next = +(prev - 0.05).toFixed(2);
                if (next <= 0) {
                    stopMainTimer();
                    return 0;
                }
                return next;
            });
        }, 50);
    }, [stopMainTimer]);

    useEffect(() => {
        if (phase === "inputting" && timeLeft <= 0) {
            handleFail("timeout");
        }
    }, [timeLeft, phase]);

    useEffect(() => () => {
        stopMainTimer();
    }, [stopMainTimer]);

    // ─── Game Logic ───────────────────────────────────────
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

    const generateSequence = (r: number) => {
        const newSeq: DdongSpot[] = [];

        for (let i = 0; i < r; i++) {
            const pos = Math.floor(Math.random() * 9) + 1;
            newSeq.push({ pos });
        }
        return newSeq;
    };

    const handleFail = useCallback((type: "wrong" | "timeout") => {
        stopMainTimer();
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setResultType(type);
        setPhase("result");

        setTimeout(() => {
            setPhase("gameover");
            saveScore(scoreRef.current);
        }, 1200);
    }, [saveScore, stopMainTimer]);

    const handleSuccess = useCallback(() => {
        stopMainTimer();
        setResultType("correct");
        scoreRef.current += 1;
        setScore(scoreRef.current);
        setPhase("result");

        setTimeout(() => {
            startRound(round + 1);
        }, 800);
    }, [round, stopMainTimer]);

    const startRound = useCallback((nextRound: number) => {
        setRound(nextRound);
        const seq = generateSequence(nextRound);
        setSequence(seq);
        setInputIndex(0);
        setPhase("playing");
        setResultType(null);
        setTimeLeft(TIME_LIMIT);
    }, []);

    const handleStart = () => {
        scoreRef.current = 0;
        setScore(0);
        startRound(1);
    };

    // 보여주기 페이즈 루프
    useEffect(() => {
        isCancelledRef.current = false;

        if (phase === "playing") {
            const run = async () => {
                await wait(800);

                for (let i = 0; i < sequence.length; i++) {
                    if (isCancelledRef.current) return;

                    const item = sequence[i];
                    setActiveHole(item.pos);

                    // 똥(💩)인 경우: 단순히 보여주고 사라짐
                    await wait(500); // 0.5초 고정
                    if (isCancelledRef.current) return;
                    setActiveHole(null);
                    await wait(200); // 0.2초 간격
                }

                // 끝까지 무사히 다 보여줬다면 입력 페이즈로 전환
                if (!isCancelledRef.current && phaseRef.current === "playing") {
                    setPhase("inputting");
                    startMainTimer();
                }
            };
            run();
        }
        return () => {
            isCancelledRef.current = true;
            setActiveHole(null);
        };
    }, [phase, sequence, round, handleFail, startMainTimer]);

    // ─── Input Handling ───────────────────────────────────

    // 게임 플레이 중 버튼 클릭 핸들링
    const handleHoleClick = useCallback((pos: number) => {
        if (phaseRef.current === "inputting") {
            // 클릭 잔상 표시 (0.5초)
            setClickedFeedbackHole(pos);
            setTimeout(() => {
                setClickedFeedbackHole(current => current === pos ? null : current);
            }, 500);

            if (inputIndex < sequence.length) {
                const expectedPos = sequence[inputIndex].pos;

                if (pos === expectedPos) {
                    // 정답 터치
                    const nextIndex = inputIndex + 1;
                    setInputIndex(nextIndex);

                    if (nextIndex >= sequence.length) {
                        // 모든 순서를 맞춤
                        handleSuccess();
                    }
                } else {
                    // 순서 틀림
                    handleFail("wrong");
                }
            }
        }
    }, [sequence, inputIndex, handleFail, handleSuccess]);

    // 키보드 지원 (1-9 키패드)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

            if (e.code === "Space") {
                if (phaseRef.current === "idle" || phaseRef.current === "gameover") {
                    e.preventDefault();
                    handleStart();
                }
            } else {
                const num = parseInt(e.key);
                if (num >= 1 && num <= 9) {
                    e.preventDefault();
                    handleHoleClick(num);
                }
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [handleHoleClick]);


    // ─── Render UI ─────────────────────────────────────────
    const progressPct = (timeLeft / TIME_LIMIT) * 100;
    const timerColor = progressPct > 50 ? "#34d399" : progressPct > 25 ? "#fb923c" : "#ef4444";
    const timerTextCls = progressPct > 50 ? "text-emerald-400" : progressPct > 25 ? "text-orange-400" : "text-red-500";

    // For rendering result icons
    const renderContent = () => {
        if (phase === "idle") {
            return (
                <div className="flex w-full h-full gap-3 md:gap-6 justify-center items-center opacity-20 pointer-events-none py-6 md:py-8 px-2 sm:px-4">
                    <span className="text-[120px]">💩</span>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-[320px] mx-auto p-4 py-8">
                {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => {
                    // 버튼 활성화 규칙
                    // inputting 시: 모든 버튼 클릭 가능
                    const isClickable = phase === "inputting";

                    return (
                        <button
                            key={num}
                            onClick={() => handleHoleClick(num)}
                            disabled={!isClickable}
                            className={`
                                relative aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-200
                                ${isClickable
                                    ? "border-border bg-card [@media(hover:hover)]:hover:border-primary/40 [@media(hover:hover)]:hover:bg-primary/5 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.96] active:shadow-sm"
                                    : "border-border/50 bg-card/50"
                                }
                            `}
                        >
                            {/* 통일된 뱃지 형태의 숫자 표시 */}
                            <span className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white bg-muted-foreground/30">{num}</span>

                            {/* 캐릭터 (보여주기 중일 때만 등장) */}
                            <div
                                className={`absolute text-4xl sm:text-5xl transition-all duration-200 pointer-events-none origin-bottom flex items-center justify-center
                                    ${activeHole === num && phase === "playing"
                                        ? 'translate-y-0 scale-100 opacity-100'
                                        : 'translate-y-2 scale-75 opacity-0'
                                    }`}
                            >
                                💩
                            </div>

                            {/* 맞힌 칸에 클릭되었다는 피드백(잔상) */}
                            <div className={`absolute text-4xl pointer-events-none transition-all duration-300 flex items-center justify-center ${clickedFeedbackHole === num ? 'opacity-30 scale-100' : 'opacity-0 scale-50'}`}>
                                💩
                            </div>
                        </button>
                    )
                })}
            </div>
        );
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

                                {/* Timer Bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-muted-foreground font-medium">TIME</span>
                                        <span className={`text-sm font-black tabular-nums transition-colors ${phase === 'inputting' ? timerTextCls : 'text-muted-foreground'}`}>
                                            {phase === 'inputting' ? `${timeLeft.toFixed(2)}s` : `${TIME_LIMIT.toFixed(2)}s`}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: phase === 'inputting' ? `${progressPct}%` : '100%',
                                                backgroundColor: phase === 'inputting' ? timerColor : '#cbd5e1',
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
                                        똥 치울 준비됐나요?
                                    </p>
                                )}
                                {phase === "playing" && (
                                    <p className="text-sm font-bold text-indigo-500 animate-pulse">
                                        똥이 나온 순서를 기억하세요.
                                    </p>
                                )}
                                {phase === "inputting" && (
                                    <p className="text-sm font-bold text-emerald-500">
                                        똥이 나타난 순서대로 치워주세요. ({inputIndex}/{sequence.length})
                                    </p>
                                )}
                                {phase === "result" && resultType === "correct" && (
                                    <p className="text-sm font-bold text-emerald-500 animate-in fade-in duration-200">정답입니다!</p>
                                )}
                                {phase === "result" && resultType === "wrong" && (
                                    <p className="text-sm font-bold text-destructive animate-in fade-in duration-200">오답입니다!</p>
                                )}
                                {phase === "result" && resultType === "timeout" && (
                                    <p className="text-sm font-bold text-orange-500 animate-in fade-in duration-200">시간 초과!</p>
                                )}
                                {phase === "gameover" && (
                                    <p className="text-sm font-bold text-destructive animate-in fade-in duration-200">
                                        똥도 못 치우시네요!
                                    </p>
                                )}
                            </div>

                            {/* Game Grid */}
                            <div className="flex w-full justify-center items-center py-2 relative min-h-[340px]">
                                {renderContent()}
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
                                {/* inputting, playing 중에는 버튼 공간만 차지하거나 없음 */}
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
                        <RankingBoard ranking={ranking} onShowAll={() => setShowAllRanking(true)} isGuest={userName === "비회원"} />
                    </div>

                    <div className="order-1 lg:order-2 flex flex-col gap-4">
                        <AnswerSection
                            isVisible={phase === "gameover" || (phase === "result" && resultType !== "correct")}
                            sequence={sequence}
                            inputIndex={inputIndex}
                        />
                    </div>
                </div>
            </div>

            {/* Ranking Modal */}
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
                                            <span className="text-sm font-black text-primary shrink-0">{entry.score}점</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <div className="p-4 border-t border-border bg-muted/20">
                                {(() => {
                                    const myRankIndex = ranking.findIndex((r) => r.user_name === userName);
                                    const myBestScore = myRankIndex !== -1 ? ranking[myRankIndex].score : undefined;
                                    const displayScore = myBestScore !== undefined && myBestScore > 0 ? `${myBestScore}점` : undefined;
                                    const myRank = displayScore !== undefined ? myRankIndex + 1 : null;
                                    return (
                                        <KakaoShareButton
                                            userName={userName}
                                            gameTitle={title!}
                                            gameUrl="/works/ddong-game"
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
                        <span>랜덤한 위치에 <strong className="text-foreground">똥(💩)</strong>이 나타나요.</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">02</span>
                        <span>제한시간 <strong>(30초)</strong> 내에 똥(💩)이 나타났던 칸을 <strong className="text-foreground">순서대로</strong> 칮으세요!</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">03</span>
                        <span>라운드가 지날수록 똥(💩)이 <strong>1개씩</strong> 증가해요.</span>
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
                {ranking.length > 0 && !isGuest && <button onClick={onShowAll} className="text-[10px] font-bold text-primary hover:text-primary/80 hover:underline transition-colors">전체보기</button>}
            </div>

            <div className={isGuest ? "filter blur-[3px] select-none pointer-events-none opacity-40" : ""}>
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
                                <span className="text-sm font-black text-primary shrink-0">{entry.score}점</span>
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

function AnswerSection({ isVisible, sequence, inputIndex }: { isVisible: boolean, sequence: DdongSpot[], inputIndex: number }) {
    if (!isVisible || sequence.length === 0) return null;

    const answerArr = sequence.map(s => s.pos);

    return (
        <div className="p-4 rounded-3xl border border-border bg-card/60 backdrop-blur-sm animate-in zoom-in-95 slide-in-from-top-2 duration-500 shadow-xl shadow-black/5">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-500">💡</span>
                <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Answer</span>
            </div>
            <div className="text-center">
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-base font-black text-foreground">
                    {answerArr.map((pos, i) => {
                        const isCorrectlyGuessed = i < inputIndex;
                        const isFailedPos = i === inputIndex;

                        let bgColor = "bg-muted/50 border-muted-foreground/20 text-muted-foreground"; // 아직 시도 안 함
                        if (isCorrectlyGuessed) {
                            bgColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"; // 정답
                        } else if (isFailedPos) {
                            bgColor = "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"; // 여기서 틀림
                        }

                        return (
                            <React.Fragment key={i}>
                                <span className={`px-2.5 py-1 rounded-lg border shadow-sm ${bgColor}`}>
                                    {pos}
                                </span>
                                {i < answerArr.length - 1 && (
                                    <span className="text-muted-foreground/40 font-bold mb-0.5">➔</span>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
