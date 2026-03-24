"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ProjectProps } from "@/components/project-registry";
import { Trophy, X, ChevronDown, Lock } from "lucide-react";
import { KakaoShareButton } from "@/components/kakao-share-button";
import { Portal } from "@/components/portal";
import { Button } from "@/components/ui/button";

type GamePhase = "idle" | "playing" | "result";

interface RankEntry {
    user_name: string;
    score: number;
    created_at: string;
}

interface Bug {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    spawnTime: number;
}

// 점과 선분 사이의 거리 제곱을 구하는 헬퍼 함수
function distToSegmentSq(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
    if (l2 === 0) return Math.pow(px - x1, 2) + Math.pow(py - y1, 2);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.pow(px - (x1 + t * (x2 - x1)), 2) + Math.pow(py - (y1 + t * (y2 - y1)), 2);
}

const CANVAS_SIZE = 480;
const GRID_DIVISIONS = 15;
const STEP = CANVAS_SIZE / GRID_DIVISIONS;

export function BugGame({ userName, title }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [score, setScore] = useState(1);
    const [finalScore, setFinalScore] = useState(0);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [showAllRanking, setShowAllRanking] = useState(false);
    const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);

    // 게임 로직을 위한 Ref
    const playerRef = useRef({ x: CANVAS_SIZE - STEP / 2, y: CANVAS_SIZE - STEP / 2, radius: 10 });
    const prevPlayerRef = useRef({ x: CANVAS_SIZE - STEP / 2, y: CANVAS_SIZE - STEP / 2 });
    const bugsRef = useRef<Bug[]>([]);
    const visitedRef = useRef<Set<string>>(new Set());
    const lastSplitTimeRef = useRef<number>(0);
    const scoreRef = useRef(1); // 버그 수
    const nextBugIdRef = useRef(1);
    const lastFrameTimeRef = useRef<number>(0);

    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/bug-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    const startGame = useCallback(() => {
        setPhase("playing");
        setScore(1);
        scoreRef.current = 1;
        setFinalScore(0);
        playerRef.current = { x: CANVAS_SIZE - STEP / 2, y: CANVAS_SIZE - STEP / 2, radius: 10 };
        prevPlayerRef.current = { x: CANVAS_SIZE - STEP / 2, y: CANVAS_SIZE - STEP / 2 };
        visitedRef.current.clear();
        visitedRef.current.add(`${GRID_DIVISIONS - 1},${GRID_DIVISIONS - 1}`); // 마지막 위치
        nextBugIdRef.current = 1;

        const startTime = performance.now();
        // 초기 버그 생성 (나와 최대한 멀리 떨어진 곳에 생성)
        bugsRef.current = [{
            id: ++nextBugIdRef.current,
            x: STEP,
            y: STEP,
            vx: 2.0,
            vy: 2.0,
            radius: 8,
            spawnTime: startTime
        }];
        lastSplitTimeRef.current = startTime;

        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(gameLoop);
    }, []);

    const endGame = useCallback(() => {
        setPhase("result");
        setFinalScore(scoreRef.current);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        const fs = scoreRef.current;
        if (fs > 0 && userName !== "비회원") {
            try {
                fetch("/api/bug-scores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ score: fs }),
                }).then(() => loadRanking());
            } catch { }
        }
    }, [userName, loadRanking]);

    const gameLoop = useCallback((time: number) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 1. 버그 분열 로직 (1.5초마다)
        const dt = time - lastSplitTimeRef.current;
        if (dt >= 1500) {
            lastSplitTimeRef.current = time;
            const currentBugs = bugsRef.current;
            const newBugs: Bug[] = [];

            if (currentBugs.length === 0) {
                // [유지] 필드에 벌레가 한 마리도 없으면 새로 하나 생성
                const margin = 100;
                newBugs.push({
                    id: ++nextBugIdRef.current,
                    x: margin + Math.random() * (CANVAS_SIZE - margin * 2),
                    y: margin + Math.random() * (CANVAS_SIZE - margin * 2),
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: (Math.random() - 0.5) * 1.5,
                    radius: 8,
                    spawnTime: time
                });
            } else {
                // [수정] 모든 벌레가 1초마다 각각 1마리씩 분열
                for (const b of currentBugs) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1.0; // 분열 후 속도 1.0

                    newBugs.push({
                        id: ++nextBugIdRef.current,
                        x: b.x,
                        y: b.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        radius: 6,
                        spawnTime: time
                    });
                }
            }

            bugsRef.current.push(...newBugs);
            scoreRef.current += newBugs.length;
            setScore(scoreRef.current);
        }

        // 2. 렌더링 초기화 (프레임 클리어)
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 3. 테마에 따른 스타일 감지
        const isDark = document.documentElement.classList.contains("dark");
        const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";

        // 배경에 은은한 점수 표시
        ctx.save();
        ctx.font = "900 200px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)";
        ctx.fillText(scoreRef.current.toString(), CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        ctx.restore();

        // 그리드 렌더링
        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_DIVISIONS; i++) {
            ctx.moveTo(i * STEP, 0); ctx.lineTo(i * STEP, CANVAS_SIZE);
            ctx.moveTo(0, i * STEP); ctx.lineTo(CANVAS_SIZE, i * STEP);
        }
        ctx.stroke();
        ctx.closePath();

        // 방문한 셀 렌더링
        visitedRef.current.forEach(key => {
            const [gx, gy] = key.split(',').map(Number);
            ctx.fillStyle = isDark ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.2)";
            ctx.fillRect(gx * STEP + 1, gy * STEP + 1, STEP - 2, STEP - 2);
        });

        // 1.5. 시간차(DeltaTime)를 이용한 프레임 독립 이동 (60FPS 기준 정규화)
        // 144Hz 등 고주사율 모니터에서도 벌레 속도가 일정하도록 보정합니다.
        if (lastFrameTimeRef.current === 0) lastFrameTimeRef.current = time;
        const deltaTimeMult = Math.min(2.0, (time - lastFrameTimeRef.current) / (1000 / 60)) || 1;
        lastFrameTimeRef.current = time;

        // 4. 버그 이동 및 충돌 체크
        let isGameOver = false;

        // 내 캐릭터(보라색) 렌더링 - 디자인 개선
        const p = playerRef.current;
        const pGradient = ctx.createRadialGradient(p.x - 2, p.y - 2, 0, p.x, p.y, p.radius);
        pGradient.addColorStop(0, "#c084fc");
        pGradient.addColorStop(1, "#8b5cf6");

        ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = pGradient;
        ctx.fill();
        ctx.closePath();

        // 캐릭터 눈 (디테일)
        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(p.x - 3, p.y - 2, 2, 0, Math.PI * 2);
        ctx.arc(p.x + 3, p.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(p.x - 3, p.y - 2, 1, 0, Math.PI * 2);
        ctx.arc(p.x + 3, p.y - 2, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        const activeBugs = bugsRef.current;
        const bugsToRemove = new Set<number>();

        // 1단계: 버그 이동 및 벽 충돌
        const WALL_MARGIN = 4;
        for (const b of activeBugs) {
            b.x += b.vx * deltaTimeMult;
            b.y += b.vy * deltaTimeMult;
            if (b.x < b.radius + WALL_MARGIN) { b.x = b.radius + WALL_MARGIN; b.vx = Math.abs(b.vx); }
            else if (b.x > CANVAS_SIZE - b.radius - WALL_MARGIN) { b.x = CANVAS_SIZE - b.radius - WALL_MARGIN; b.vx = -Math.abs(b.vx); }
            if (b.y < b.radius + WALL_MARGIN) { b.y = b.radius + WALL_MARGIN; b.vy = Math.abs(b.vy); }
            else if (b.y > CANVAS_SIZE - b.radius - WALL_MARGIN) { b.y = CANVAS_SIZE - b.radius - WALL_MARGIN; b.vy = -Math.abs(b.vy); }
        }

        // 2단계: 버그끼리 충돌 체크 (부딪히면 소멸)
        for (let i = 0; i < activeBugs.length; i++) {
            const b1 = activeBugs[i];
            const isB1Immune = (time - b1.spawnTime < 250); // 0.25초 무적

            for (let j = i + 1; j < activeBugs.length; j++) {
                const b2 = activeBugs[j];
                const isB2Immune = (time - b2.spawnTime < 250);

                const dx = b1.x - b2.x;
                const dy = b1.y - b2.y;
                const distSq = dx * dx + dy * dy;
                const minDist = b1.radius + b2.radius;

                if (distSq < minDist * minDist) {
                    if (isB1Immune || isB2Immune) {
                        // 한쪽이라도 무적 상태면 서로 통과 (소멸 없음)
                        continue;
                    } else {
                        // 둘 다 무적이 아니면 동귀어진 (둘 다 소멸)
                        bugsToRemove.add(b1.id);
                        bugsToRemove.add(b2.id);
                    }
                }
            }
        }

        // 3단계: 소멸된 버그 제외 (점수는 누적이므로 갱신하지 않음)
        if (bugsToRemove.size > 0) {
            bugsRef.current = activeBugs.filter(b => !bugsToRemove.has(b.id));
        }

        const timeInSeconds = time / 1000;

        // 4단계: 버그 렌더링 및 플레이어 충돌 체크
        for (const b of activeBugs) {
            // 사용자 요청: 움찔거리는(Pulsing) 효과 제거하여 시각적 안정성 확보
            const currentBRadius = b.radius;

            ctx.save();
            ctx.translate(b.x, b.y);

            // 1. 본체 구체 (그라데이션)
            const bGradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, currentBRadius);
            bGradient.addColorStop(0, "#f87171"); // 밝은 빨강
            bGradient.addColorStop(1, "#dc2626"); // 어두운 빨강

            ctx.beginPath();
            ctx.arc(0, 0, currentBRadius, 0, Math.PI * 2);
            ctx.fillStyle = bGradient;
            ctx.fill();
            ctx.closePath();

            // 3. 상단 하이라이트 (구 형태 강조)
            ctx.beginPath();
            ctx.arc(-currentBRadius * 0.3, -currentBRadius * 0.3, currentBRadius * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.fill();
            ctx.closePath();

            ctx.restore();

            const bPos = { x: b.x, y: b.y };
            const p1 = { x: prevPlayerRef.current.x, y: prevPlayerRef.current.y };
            const p2 = { x: playerRef.current.x, y: playerRef.current.y };
            const distSq = distToSegmentSq(bPos.x, bPos.y, p1.x, p1.y, p2.x, p2.y);
            // 사용자 요청: 겹쳐야 죽는 게 아니라 닿기만 해도 죽도록 (-2 마진 제거)
            const thresholdSq = Math.pow(b.radius + playerRef.current.radius, 2);
            if (distSq < thresholdSq) isGameOver = true;
        }

        // 현재 위치를 이전 위치로 저장
        prevPlayerRef.current = { ...playerRef.current };

        if (isGameOver) {
            endGame();
        } else {
            requestRef.current = requestAnimationFrame(gameLoop);
        }

    }, [endGame]);

    // 언마운트 정리
    useEffect(() => {
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, []);

    // 키보드/버튼 이동 로직
    const movePlayer = useCallback((dx: number, dy: number) => {
        if (phase !== "playing") return;
        const nextX = playerRef.current.x + dx * STEP;
        const nextY = playerRef.current.y + dy * STEP;

        if (nextX >= 0 && nextX <= CANVAS_SIZE && nextY >= 0 && nextY <= CANVAS_SIZE) {
            const gx = Math.floor(nextX / STEP);
            const gy = Math.floor(nextY / STEP);
            const key = `${gx},${gy}`;

            if (visitedRef.current.has(key)) return; // 이미 방문한 곳 차단

            playerRef.current.x = nextX;
            playerRef.current.y = nextY;
            visitedRef.current.add(key);
        }
    }, [phase]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (phase === "playing") {
                if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                    e.preventDefault();
                    setActiveKeys(prev => ({ ...prev, [e.key]: true }));
                    switch (e.key) {
                        case "ArrowUp": movePlayer(0, -1); break;
                        case "ArrowDown": movePlayer(0, 1); break;
                        case "ArrowLeft": movePlayer(-1, 0); break;
                        case "ArrowRight": movePlayer(1, 0); break;
                    }
                }
            } else if (e.code === "Space") {
                e.preventDefault();
                startGame();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                setActiveKeys(prev => ({ ...prev, [e.key]: false }));
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [phase, movePlayer, startGame]);

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
                <div className="order-1 lg:hidden">
                    <HTPSection />
                </div>

                <div className="order-2 lg:flex-1 min-w-0 flex justify-center">
                    <div className="relative rounded-2xl border border-border bg-card overflow-hidden w-full flex flex-col p-0 gap-0">
                        {/* 게임 영역 */}
                        <div
                            className="relative w-full max-w-[480px] mx-auto aspect-square bg-slate-50 dark:bg-zinc-950 rounded-3xl overflow-hidden shadow-inner border-[6px] border-slate-200 dark:border-zinc-900 transition-colors"
                            onClick={() => phase !== "playing" && startGame()}
                        >
                            <canvas
                                ref={canvasRef}
                                width={CANVAS_SIZE}
                                height={CANVAS_SIZE}
                                className="w-full h-full touch-none block"
                            />

                            {/* 오버레이 (대기/결과) */}
                            {phase !== "playing" && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/80 backdrop-blur-[2px] p-4 cursor-pointer transition-colors group">
                                    {phase === "result" && (
                                        <div className="text-center mb-12 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
                                            <p className="text-lg font-bold text-destructive mb-2 uppercase tracking-widest">GAME OVER</p>
                                            <div className="flex items-baseline justify-center gap-1">
                                                <span className="text-7xl font-black text-foreground drop-shadow-sm">{finalScore}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col items-center gap-6">
                                        <div className="text-sm font-black text-primary uppercase tracking-[0.2em] animate-pulse">
                                            터치하여 시작하세요
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 하단 컨트롤 영역 - 방향키(십자/ㅗ) 배열 배치 */}
                        <div className="flex flex-col items-center justify-center w-full max-w-[480px] mx-auto pt-4 pb-2 px-2 gap-2">
                            {/* 윗줄: 상 */}
                            <div className="flex justify-center w-full">
                                <Button
                                    variant={activeKeys["ArrowUp"] ? "default" : "secondary"}
                                    size="icon"
                                    className={`w-16 h-16 rounded-2xl shadow-xl transition-transform ${activeKeys["ArrowUp"] ? "scale-90" : "hover:scale-105"}`}
                                    onPointerDown={() => { movePlayer(0, -1); setActiveKeys(prev => ({ ...prev, ArrowUp: true })); }}
                                    onPointerUp={() => setActiveKeys(prev => ({ ...prev, ArrowUp: false }))}
                                    onPointerLeave={() => setActiveKeys(prev => ({ ...prev, ArrowUp: false }))}
                                >
                                    <ChevronDown className="w-10 h-10 rotate-180" />
                                </Button>
                            </div>

                            {/* 아랫줄: 좌 하 우 */}
                            <div className="flex justify-center gap-2 w-full">
                                <Button
                                    variant={activeKeys["ArrowLeft"] ? "default" : "secondary"}
                                    size="icon"
                                    className={`w-16 h-16 rounded-2xl shadow-xl transition-transform ${activeKeys["ArrowLeft"] ? "scale-90" : "hover:scale-105"}`}
                                    onPointerDown={() => { movePlayer(-1, 0); setActiveKeys(prev => ({ ...prev, ArrowLeft: true })); }}
                                    onPointerUp={() => setActiveKeys(prev => ({ ...prev, ArrowLeft: false }))}
                                    onPointerLeave={() => setActiveKeys(prev => ({ ...prev, ArrowLeft: false }))}
                                >
                                    <ChevronDown className="w-10 h-10 rotate-90" />
                                </Button>
                                <Button
                                    variant={activeKeys["ArrowDown"] ? "default" : "secondary"}
                                    size="icon"
                                    className={`w-16 h-16 rounded-2xl shadow-xl transition-transform ${activeKeys["ArrowDown"] ? "scale-90" : "hover:scale-105"}`}
                                    onPointerDown={() => { movePlayer(0, 1); setActiveKeys(prev => ({ ...prev, ArrowDown: true })); }}
                                    onPointerUp={() => setActiveKeys(prev => ({ ...prev, ArrowDown: false }))}
                                    onPointerLeave={() => setActiveKeys(prev => ({ ...prev, ArrowDown: false }))}
                                >
                                    <ChevronDown className="w-10 h-10" />
                                </Button>
                                <Button
                                    variant={activeKeys["ArrowRight"] ? "default" : "secondary"}
                                    size="icon"
                                    className={`w-16 h-16 rounded-2xl shadow-xl transition-transform ${activeKeys["ArrowRight"] ? "scale-90" : "hover:scale-105"}`}
                                    onPointerDown={() => { movePlayer(1, 0); setActiveKeys(prev => ({ ...prev, ArrowRight: true })); }}
                                    onPointerUp={() => setActiveKeys(prev => ({ ...prev, ArrowRight: false }))}
                                    onPointerLeave={() => setActiveKeys(prev => ({ ...prev, ArrowRight: false }))}
                                >
                                    <ChevronDown className="w-10 h-10 -rotate-90" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="order-3 lg:w-64 shrink-0 flex flex-col gap-4">
                    <div className="hidden lg:block">
                        <HTPSection />
                    </div>
                    <RankingBoard ranking={ranking} onShowAll={() => setShowAllRanking(true)} isGuest={userName === "비회원"} />
                </div>
            </div>

            {showAllRanking && (
                <Portal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAllRanking(false)}>
                        <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-sm tracking-wide text-foreground uppercase flex-1">전체 랭킹</h3>
                                <button onClick={() => setShowAllRanking(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-4 max-h-[60vh] overflow-y-auto">
                                <ol className="space-y-2">
                                    {ranking.map((entry, i) => (
                                        <li key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${i === 0 ? "bg-yellow-400/10 border border-yellow-400/25" : i === 1 ? "bg-slate-400/10 border border-slate-400/20" : i === 2 ? "bg-orange-400/10 border border-orange-400/20" : "bg-muted/30 border border-transparent"}`}>
                                            <span className="text-sm font-black w-6 text-center text-muted-foreground">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate text-foreground">{entry.user_name}</p>
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
                                        <KakaoShareButton userName={userName} gameTitle={title!} gameUrl="/works/bug-game" displayScore={displayScore} rank={myRank} />
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
                    <li className="flex gap-2">
                        <span className="text-primary font-bold shrink-0">01</span>
                        <span><strong>방향키 또는 하단 양쪽에 배치된 화살표 버튼을 눌러 캐릭터를 움직이세요.</strong></span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-primary font-bold shrink-0">02</span>
                        <span><strong>1.5초마다 빨간 덩어리가 무섭게 늘어나요. <br />덩어리끼리 닿아도 사라져요.</strong></span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-primary font-bold shrink-0">03</span>
                        <span><strong>캐릭터가 덩어리에 닿으면 끝나요. <br />모든 덩어리의 수를 누적으로 평가해요</strong>.</span>
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
                    <button onClick={onShowAll} className="text-[10px] font-bold text-primary hover:text-primary/80 hover:underline transition-colors">전체보기</button>
                )}
            </div>
            <div className={isGuest ? "filter blur-[3px] select-none pointer-events-none opacity-40" : ""}>
                {ranking.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">아직 기록이 없어요</p>
                ) : (
                    <ol className="space-y-2">
                        {ranking.slice(0, 3).map((entry, i) => (
                            <li key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${i === 0 ? "bg-yellow-400/10 border border-yellow-400/25" : i === 1 ? "bg-slate-400/10 border border-slate-400/20" : "bg-orange-400/10 border border-orange-400/20"}`}>
                                <span className="text-base shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                                <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate text-foreground">{entry.user_name}</p></div>
                                <span className="text-sm font-black text-primary shrink-0">{entry.score}점</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
            {isGuest && (
                <div className="absolute inset-0 top-[44px] flex flex-col items-center justify-center bg-card/10 backdrop-blur-[1px] z-10 p-4 text-center">
                    <div className="p-2 rounded-full bg-primary/10 mb-2"><Lock className="w-4 h-4 text-primary" /></div>
                    <p className="text-[11px] font-bold text-foreground mb-1 leading-tight auto-phrase">조회 권한이 없어요.</p>
                    <button onClick={() => window.location.href = '/auth/login'} className="text-[10px] font-black text-primary hover:underline mt-1">로그인하기</button>
                </div>
            )}
        </div>
    );
}
