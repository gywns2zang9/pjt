"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ProjectProps } from "@/components/project-registry";
import { Button } from "@/components/ui/button";
import { User, Plus, Minus } from "lucide-react";

type GamePhase = "setup" | "ready" | "sequence" | "go" | "result" | "fault" | "timeout" | "all-finished";

interface PlayerEntry {
    id: number;
    score: number | null;
    status: "pending" | "done" | "fault" | "timeout";
}

export function SpeedGameMulti({ title }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("setup");
    const [totalPlayers, setTotalPlayers] = useState(2);
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
    const [players, setPlayers] = useState<PlayerEntry[]>([]);

    const [activeLights, setActiveLights] = useState(0);
    const [resultTime, setResultTime] = useState<number | null>(null);

    const sequenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const goTimerRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    const clearTimers = useCallback(() => {
        if (sequenceTimerRef.current) { clearInterval(sequenceTimerRef.current); sequenceTimerRef.current = null; }
        if (goTimerRef.current) { clearTimeout(goTimerRef.current); goTimerRef.current = null; }
        if (timeoutTimerRef.current) { clearTimeout(timeoutTimerRef.current); timeoutTimerRef.current = null; }
    }, []);

    const initGame = useCallback(() => {
        clearTimers();
        setPlayers(Array.from({ length: totalPlayers }, (_, i) => ({ id: i + 1, score: null, status: "pending" as const })));
        setCurrentPlayerIdx(0);
        setActiveLights(0);
        setResultTime(null);
        setPhase("ready");
    }, [totalPlayers, clearTimers]);

    const startSequence = useCallback(() => {
        setPhase("sequence");
        setActiveLights(0);
        setResultTime(null);
        clearTimers();

        let l = 1;
        setActiveLights(l);

        sequenceTimerRef.current = setInterval(() => {
            l++;
            if (l <= 3) {
                setActiveLights(l);
                if (l === 3) {
                    if (sequenceTimerRef.current) clearInterval(sequenceTimerRef.current);
                    const randomDelay = Math.random() * 4800 + 200;
                    goTimerRef.current = setTimeout(() => {
                        setActiveLights(0);
                        setPhase("go");
                        startTimeRef.current = performance.now();
                    }, randomDelay);
                }
            }
        }, 1000);
    }, [clearTimers]);

    const handlePointerDown = useCallback((e?: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
        if (phase === "ready") {
            startSequence();
        }
    }, [phase, startSequence]);

    const handlePointerUp = useCallback((e?: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
        if (phase === "sequence") {
            clearTimers();
            setPhase("fault");
            setPlayers(prev => prev.map((p, i) => i === currentPlayerIdx ? { ...p, score: null, status: "fault" as const } : p));
            return;
        }

        if (phase === "go") {
            const timeDiff = performance.now() - startTimeRef.current;
            const finalScore = parseFloat((timeDiff / 1000).toFixed(5));
            clearTimers();
            setPhase("result");
            setResultTime(finalScore);
            setPlayers(prev => prev.map((p, i) => i === currentPlayerIdx ? { ...p, score: finalScore, status: "done" as const } : p));
        }
    }, [phase, currentPlayerIdx, clearTimers]);

    const goNext = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentPlayerIdx < totalPlayers - 1) {
            setCurrentPlayerIdx(prev => prev + 1);
            setPhase("ready");
            setActiveLights(0);
            setResultTime(null);
        } else {
            setPhase("all-finished");
        }
    }, [currentPlayerIdx, totalPlayers]);



    useEffect(() => {
        if (phase === "go") {
            timeoutTimerRef.current = setTimeout(() => {
                setPhase("timeout");
                setPlayers(prev => prev.map((p, i) => i === currentPlayerIdx ? { ...p, score: null, status: "timeout" as const } : p));
                clearTimers();
            }, 1000);
        }
        return () => { if (timeoutTimerRef.current) { clearTimeout(timeoutTimerRef.current); timeoutTimerRef.current = null; } };
    }, [phase, currentPlayerIdx, clearTimers]);



    if (phase === "all-finished") {
        return (
            <div className="w-full max-w-6xl mx-auto flex flex-col items-center p-6 md:p-8 space-y-6 bg-card border rounded-2xl shadow-sm animate-in zoom-in">
                <div className="w-full space-y-2">
                    {players.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 border-transparent">
                            <span className="font-bold text-lg">플레이어 {p.id}</span>
                            <span className="font-black text-xl tabular-nums">{p.status === "done" ? `${(p.score! * 1000).toFixed(2)}ms` : p.status === "fault" ? "실격" : "시간초과"}</span>
                        </div>
                    ))}
                </div>
                <div className="flex gap-3 w-full">
                    <Button className="flex-1 h-12 font-bold rounded-xl" onClick={() => initGame()}>다시하기</Button>
                    <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={() => setPhase("setup")}>인원수 변경</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto">
            <div className="w-full flex flex-col items-center p-4 md:p-8 space-y-4 md:space-y-6 bg-card border rounded-3xl relative overflow-hidden shadow-sm">

                {phase !== "setup" && (
                    <div className="flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary rounded-full border border-primary/20 animate-in slide-in-from-top-4">
                        <User className="w-4 h-4" />
                        <span className="font-bold text-sm tracking-tight text-foreground">플레이어 {players[currentPlayerIdx]?.id} 차례</span>
                    </div>
                )}

                <div className="w-full h-32 md:h-44 bg-slate-50 dark:bg-zinc-950 rounded-[2.5rem] border-4 border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-2xl pointer-events-none flex flex-col items-center justify-center transition-all duration-500 overflow-hidden relative">
                    {phase === "setup" ? (
                        <div className="text-slate-400 dark:text-zinc-500 font-bold text-sm tracking-widest">인원수를 설정해주세요.</div>
                    ) : (phase === "result" || phase === "fault" || phase === "timeout") ? (
                        <div className="text-slate-400 dark:text-zinc-500 font-bold text-sm tracking-widest">기록되었습니다. 다음 사람에게 넘겨주세요.</div>
                    ) : (
                        <div className="flex flex-row justify-center gap-4 md:gap-8 items-center w-full px-4">
                            {[1, 2, 3].map((idx) => (
                                <div key={idx} className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-900 shadow-inner relative flex shrink-0">
                                    <div className={`absolute inset-0 rounded-full transition-all duration-100 ${activeLights >= idx ? 'bg-red-500 shadow-[0_0_30px_theme(colors.red.500),inset_0_0_15px_theme(colors.white)]' : 'bg-transparent'}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div
                    className={`relative border-4 border-solid rounded-[2.5rem] overflow-hidden w-full h-64 md:h-96 flex flex-col items-center justify-center transition-all cursor-pointer select-none
                        ${(phase === 'sequence' || phase === 'go') ? 'border-primary/50 bg-primary/10 shadow-inner scale-[0.98]' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-primary/40'}`}
                    onPointerDown={() => handlePointerDown()}
                    onPointerUp={() => handlePointerUp()}
                >
                    {phase === "setup" ? (
                        <div className="flex flex-col items-center space-y-8 animate-in fade-in duration-500 pointer-events-auto">
                            <div className="flex items-center gap-6 md:gap-10">
                                <button
                                    className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-white flex items-center justify-center border-2 border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-900 active:scale-90 transition-all shadow-sm"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setTotalPlayers(Math.max(2, totalPlayers - 1)); }}
                                >
                                    <Minus className="w-5 h-5 stroke-[4]" />
                                </button>

                                <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-slate-100 dark:border-zinc-800 flex items-center justify-center bg-transparent">
                                    <span className="text-4xl md:text-6xl font-black text-blue-500 drop-shadow-sm leading-none select-none">{totalPlayers}</span>
                                </div>

                                <button
                                    className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-white flex items-center justify-center border-2 border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-900 active:scale-90 transition-all shadow-sm"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setTotalPlayers(Math.min(8, totalPlayers + 1)); }}
                                >
                                    <Plus className="w-5 h-5 stroke-[4]" />
                                </button>
                            </div>

                            <Button
                                className="h-12 md:h-16 px-12 md:px-16 text-lg md:text-xl font-black rounded-2xl shadPow-xl hover:scale-105 active:scale-95 transition-all bg-primary"
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); initGame(); }}
                            >
                                게임 시작
                            </Button>
                        </div>
                    ) : phase === "ready" ? (
                        <div className="text-muted-foreground font-bold tracking-widest text-center">화면을 길게 누르세요!</div>
                    ) : (phase === "result" || phase === "fault" || phase === "timeout") ? (
                        <div className="flex flex-col items-center pointer-events-auto animate-in zoom-in duration-300 w-full px-10" onPointerDown={e => e.stopPropagation()}>
                            <Button className="h-14 md:h-16 w-full max-w-[280px] font-black text-lg md:text-xl rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all" onClick={goNext}>
                                {currentPlayerIdx < totalPlayers - 1 ? `플레이어 ${players[currentPlayerIdx + 1]?.id}` : "결과 확인"}
                            </Button>
                        </div>
                    ) : (
                        <div className="text-xl font-bold text-foreground text-center animate-in zoom-in pointer-events-none px-6">불이 모두 꺼지면<br />손을 떼세요!</div>
                    )}
                </div>
            </div>
        </div >
    );
}
