"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ProjectProps } from "@/components/project-registry";
import { Trophy, X, ChevronDown, AlertCircle } from "lucide-react";
import { KakaoShareButton } from "@/components/kakao-share-button";
import { Portal } from "@/components/portal";

type GamePhase = "idle" | "playing" | "result";
type EyeState = "closed" | "open";
type GameOverReason = "detection" | "timeout";

interface RankEntry {
    user_name: string;
    score: number;
    created_at: string;
}

export function EyesGame({ userName, title }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [playerEyesOpen, setPlayerEyesOpen] = useState(false);
    const [computerEyeState, setComputerEyeState] = useState<EyeState>("closed");
    const [score, setScore] = useState(0);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [showAllRanking, setShowAllRanking] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [gameOverReason, setGameOverReason] = useState<GameOverReason>("detection");
    const [showRestartMessage, setShowRestartMessage] = useState(false);
    const [idleTime, setIdleTime] = useState(0);

    const gameLoopRef = useRef<number | null>(null);
    const computerTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastTickRef = useRef<number>(0);
    const idleTimeRef = useRef<number>(0);
    const isPlayingRef = useRef(false);
    const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastSoundTimeRef = useRef<number>(0);

    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/eyes-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    const playAlertSound = useCallback(() => {
        try {
            if (!audioContextRef.current) {
                const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                if (AudioContextClass) {
                    audioContextRef.current = new AudioContextClass();
                }
            }

            const ctx = audioContextRef.current;
            if (!ctx) return;

            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            lastSoundTimeRef.current = Date.now();

            const bufferSize = ctx.sampleRate * 1.5;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(400, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.2);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.frequency.setValueAtTime(60, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.5);
            oscGain.gain.setValueAtTime(0.3, ctx.currentTime);
            oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.connect(oscGain);
            oscGain.connect(ctx.destination);

            noise.start();
            osc.start();
            noise.stop(ctx.currentTime + 1.2);
            osc.stop(ctx.currentTime + 1.2);
        } catch (e) { }
    }, []);

    const startGame = () => {
        setPhase("playing");
        isPlayingRef.current = true;
        setShowRestartMessage(false);
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        setScore(0);
        setFinalScore(0);
        setIdleTime(0);
        idleTimeRef.current = 0;
        setPlayerEyesOpen(false);
        setComputerEyeState("closed");
        setGameOverReason("detection");
        lastTickRef.current = performance.now();
    };

    const endGame = useCallback((reason: GameOverReason = "detection") => {
        setPhase("result");
        isPlayingRef.current = false;
        setGameOverReason(reason);
        setFinalScore(score);
        if (computerTimerRef.current) clearTimeout(computerTimerRef.current);

        if (reason === "detection") {
            playAlertSound();
        }

        restartTimerRef.current = setTimeout(() => {
            setShowRestartMessage(true);
        }, 1000);

        if (userName !== "비회원") {
            fetch("/api/eyes-scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: score }),
            }).then(() => loadRanking()).catch(console.error);
        }
    }, [score, userName, loadRanking, playAlertSound]);

    // Computer eyes logic
    useEffect(() => {
        if (phase === 'playing') {
            const scheduleNext = (currentState: EyeState) => {
                const nextState = currentState === 'closed' ? 'open' : 'closed';
                const delay = Math.random() * 4900 + 100;

                computerTimerRef.current = setTimeout(() => {
                    if (!isPlayingRef.current) return;
                    setComputerEyeState(nextState);
                    if (nextState === 'open') playAlertSound();
                    scheduleNext(nextState);
                }, delay);
            };

            scheduleNext('closed');

            return () => {
                if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
            };
        }
    }, [phase, playAlertSound]);

    const tick = useCallback((t: number) => {
        if (phase !== "playing") return;

        const delta = (t - lastTickRef.current) / 1000;
        lastTickRef.current = t;

        if (playerEyesOpen && computerEyeState === "open") {
            endGame("detection");
            return;
        }

        if (!playerEyesOpen) {
            idleTimeRef.current += delta;
            setIdleTime(idleTimeRef.current);

            if (idleTimeRef.current >= 15) {
                endGame("timeout");
                return;
            }
        } else {
            idleTimeRef.current = 0;
            setScore(prev => prev + delta);
        }

        gameLoopRef.current = requestAnimationFrame(tick);
    }, [phase, playerEyesOpen, computerEyeState, endGame]);

    useEffect(() => {
        if (phase === "playing") {
            gameLoopRef.current = requestAnimationFrame(tick);
        } else {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        }
        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [phase, tick]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!audioContextRef.current) {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (AudioContextClass) {
                audioContextRef.current = new AudioContextClass();
            }
        }
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }

        if (phase === "idle" || (phase === "result" && showRestartMessage)) {
            if ((e.target as HTMLElement).closest('button')) return;
            startGame();
        } else if (phase === "playing") {
            setPlayerEyesOpen(true);
        }
    };

    const handlePointerUp = () => {
        if (phase === "playing") {
            setPlayerEyesOpen(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
                e.preventDefault();
                if (phase === "idle" || (phase === "result" && showRestartMessage)) {
                    startGame();
                } else if (phase === "playing") {
                    setPlayerEyesOpen(true);
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                if (phase === "playing") {
                    setPlayerEyesOpen(false);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [phase, showRestartMessage]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto select-none">
            <div className="order-1 lg:hidden">
                <HTPSection />
            </div>

            <div
                className={`order-2 lg:flex-1 min-w-0 flex flex-col items-center justify-between p-8 min-h-[500px] border rounded-2xl relative overflow-hidden transition-all duration-500
                    ${(phase === 'playing' && playerEyesOpen)
                        ? 'bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent)] border-primary/30 shadow-[inset_0_0_40px_rgba(var(--primary),0.02)]'
                        : 'bg-card border-border/60 shadow-sm'}`}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <div className="z-10 text-center space-y-1">
                    <div className="text-6xl font-black tabular-nums tracking-tighter text-foreground drop-shadow-sm">
                        {score.toFixed(2)}<span className="text-2xl ml-1 text-muted-foreground">s</span>
                    </div>
                </div>

                <div className="w-full flex items-center justify-around relative px-4">
                    <div className="flex flex-col items-center gap-6">
                        <CharacterSVG isOpen={playerEyesOpen} color="hsl(var(--primary))" isPlayer />
                        <div className="px-5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary tracking-[0.2em] uppercase shadow-sm">
                            You
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                        <span className="text-sm font-black italic text-muted-foreground/30 tracking-tight">VS</span>
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <CharacterSVG isOpen={computerEyeState === "open"} color="hsl(var(--destructive))" />
                        <div className="px-5 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-[10px] font-black text-destructive tracking-[0.2em] uppercase shadow-sm">
                            Bot
                        </div>
                    </div>
                </div>

                <div className="z-10 h-20 flex flex-col items-center justify-center">
                    {phase === "idle" ? (
                        <div className="flex flex-col items-center animate-bounce">
                            <span className="text-sm font-bold text-muted-foreground">화면을 눌러 시작!</span>
                        </div>
                    ) : phase === "result" ? (
                        <div className="flex flex-col items-center animate-in zoom-in duration-300">
                            {gameOverReason === "timeout" ? (
                                <div className="flex items-center gap-2 text-primary font-black text-2xl mb-1 tracking-tighter">
                                    <AlertCircle className="w-6 h-6 text-primary/60" />
                                    너무 쫄았네요.
                                </div>
                            ) : (
                                <div className="text-destructive font-black text-2xl mb-1 tracking-tighter text-center">딱 걸렸네요.</div>
                            )}
                            {showRestartMessage && (
                                <div className="flex flex-col items-center animate-bounce mt-4">
                                    <span className="text-sm font-bold text-muted-foreground">화면을 눌러 다시 도전!</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className={`text-sm font-bold transition-all duration-300 ${playerEyesOpen ? "text-primary scale-110" : "text-muted-foreground opacity-50"}`}>
                                {playerEyesOpen ? "버티세요!" : "눈을 뜨세요!"}
                            </div>

                            {!playerEyesOpen && (
                                <div className="w-40 h-1 bg-muted rounded-full overflow-hidden shadow-inner border border-border/50">
                                    <div
                                        className={`h-full transition-colors duration-300 ${idleTime > 10 ? 'bg-destructive' : 'bg-primary/40'}`}
                                        style={{ width: `${Math.min(100, (idleTime / 15) * 100)}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {phase === "result" && (
                    <div className={`absolute inset-0 pointer-events-none animate-in fade-in duration-300 ${gameOverReason === 'timeout' ? 'bg-primary/5' : 'bg-destructive/5'}`} />
                )}
            </div>

            <div className="order-3 lg:w-64 shrink-0 flex flex-col gap-4">
                <div className="hidden lg:block">
                    <HTPSection />
                </div>
                <RankingBoard
                    ranking={ranking}
                    onShowAll={() => setShowAllRanking(true)}
                />
            </div>

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
                                <ol className="space-y-2">
                                    {ranking.map((entry, i) => (
                                        <li key={i} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${i < 3 ? "bg-primary/5 border border-primary/10 shadow-sm" : "bg-muted/30"}`}>
                                            <span className="w-8 text-center font-black text-lg italic text-muted-foreground font-sans">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
                                            <span className="flex-1 truncate text-sm font-bold text-foreground">{entry.user_name}</span>
                                            <span className="font-black text-primary tabular-nums text-base">{entry.score.toFixed(2)}s</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <div className="p-5 border-t border-border/50 bg-muted/20">
                                {(() => {
                                    const rank = ranking.findIndex(r => r.user_name === userName) + 1;
                                    return (
                                        <KakaoShareButton
                                            userName={userName}
                                            gameTitle={title!}
                                            gameUrl="/works/eyes-game"
                                            displayScore={`${finalScore.toFixed(2)}s`}
                                            rank={rank > 0 ? rank : null}
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
}

function CharacterSVG({ isOpen, color, isPlayer }: { isOpen: boolean, color: string, isPlayer?: boolean }) {
    return (
        <div className={`relative w-32 h-32 md:w-40 md:h-40 transition-transform duration-300 ${isOpen ? "scale-105" : "scale-100"}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                <rect x="15" y="20" width="70" height="70" rx="20" fill={color} opacity={isPlayer ? "0.15" : "0.1"} />
                <rect x="20" y="25" width="60" height="60" rx="15" fill={color} />
                <g transform="translate(0, -5)">
                    {isOpen ? (
                        <>
                            <circle cx="40" cy="50" r="7" fill="black" />
                            <circle cx="60" cy="50" r="7" fill="black" />
                            <circle cx="42" cy="48" r="2.5" fill="white" />
                            <circle cx="62" cy="48" r="2.5" fill="white" />
                        </>
                    ) : (
                        <>
                            <path d="M33 50 L47 50" stroke="black" strokeWidth="3" strokeLinecap="round" />
                            <path d="M53 50 L67 50" stroke="black" strokeWidth="3" strokeLinecap="round" />
                        </>
                    )}
                </g>
                <path d={isOpen ? "M40 70 Q50 75 60 70" : "M44 70 L56 70"} stroke="black" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <circle cx="15" cy="25" r="5" fill={color} />
            </svg>
            {isOpen && <div className="absolute -top-4 -right-2 animate-bounce"><span className="text-2xl">❕</span></div>}
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
                        <span>화면을 <strong>누르면</strong> 눈을 떠요. <br />눈을 뜨고 있는 <strong>시간만</strong> 누적해요.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-primary font-bold shrink-0 leading-none">02</span>
                        <span>Bot과 <strong>눈을 마주치면</strong> 끝나요. <br /><strong>15초 동안</strong> 눈을 뜨지 않아도 끝나요.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-primary font-bold shrink-0 leading-none">03</span>
                        <span>Bot은 <strong>0.1초 ~ 5초</strong>마다 눈을 뜨거나 감아요.</span>
                    </li>
                </ul>
            )}
        </div>
    );
}

function RankingBoard({ ranking, onShowAll }: { ranking: RankEntry[], onShowAll: () => void }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-sm tracking-wide text-foreground uppercase flex-1">TOP 3</h2>
                {ranking.length > 0 && <button onClick={onShowAll} className="text-[10px] font-bold text-primary hover:text-primary/80 hover:underline transition-colors">전체보기</button>}
            </div>
            {ranking.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">아직 기록이 없어요</p> : (
                <ol className="space-y-2">
                    {ranking.slice(0, 3).map((entry, i) => (
                        <li key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${i === 0 ? "bg-yellow-400/10 border border-yellow-400/25" : i === 1 ? "bg-slate-400/10 border border-slate-400/20" : "bg-orange-400/10 border border-orange-400/20"}`}>
                            <span className="text-base shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                            <div className="flex-1 min-w-0 font-sans"><p className="text-sm font-semibold truncate text-foreground">{entry.user_name}</p></div>
                            <span className="text-sm font-black text-primary tabular-nums">{entry.score.toFixed(2)}s</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
