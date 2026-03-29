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
    isPermanent?: boolean;
}


const CANVAS_SIZE = 480;
const GRID_DIVISIONS = 12;
const STEP = CANVAS_SIZE / GRID_DIVISIONS;

// --- 게임 설정 (여기서 밸런스를 조절하세요) ---
const INITIAL_BUG_SPEED = 2.0;    // 초기 대장 버그 속도
const SPLIT_BUG_SPEED = 1.0;      // 분열되는 버그 속도
const SPLIT_INTERVAL = 2000;     // 분열 주기 (ms)
const BUG_SIZE = 10;               // 버그 크기 (반경, 파란색 대장 버그 기준)
// ------------------------------------------

export function BugGame({ userName, title }: ProjectProps) {
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [showControls, setShowControls] = useState(false); // 컨트롤 표시 여부 (기본값: 숨김)
    const [finalScore, setFinalScore] = useState(0);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [showAllRanking, setShowAllRanking] = useState(false);
    const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);

    // 모바일 기기 감지하여 컨트롤 자동 표시
    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setShowControls(true);
        }
    }, []);

    // 게임 로직을 위한 Ref
    const playerRef = useRef({ x: CANVAS_SIZE - STEP / 2, y: CANVAS_SIZE - STEP / 2, radius: 14 });
    const prevPlayerRef = useRef({ x: CANVAS_SIZE - STEP / 2, y: CANVAS_SIZE - STEP / 2 });
    const bugsRef = useRef<Bug[]>([]);
    const visitedRef = useRef<Set<string>>(new Set());
    const lastSplitTimeRef = useRef<number>(0);
    const scoreRef = useRef(0); // 점수
    const nextBugIdRef = useRef(1);
    const lastFrameTimeRef = useRef<number>(0);
    const itemRef = useRef<{ gx: number, gy: number, value: number, type: 'point' | 'cleaner' } | null>(null);
    const boxCountRef = useRef<number>(0); // 먹은 일반 박스 개수 (3개마다 클리너 등장)

    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/bug-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    const startGame = useCallback(() => {
        setPhase("playing");
        setFinalScore(0);
        setActiveKeys({});
        const startGX = Math.floor(Math.random() * GRID_DIVISIONS);
        const startGY = Math.floor(Math.random() * GRID_DIVISIONS);

        playerRef.current = { x: startGX * STEP + STEP / 2, y: startGY * STEP + STEP / 2, radius: 14 };
        prevPlayerRef.current = { x: playerRef.current.x, y: playerRef.current.y };
        visitedRef.current.clear();
        visitedRef.current.add(`${startGX},${startGY}`);
        nextBugIdRef.current = 1;

        // 보너스 점수 박스 초기화 (+100 고정, 동색부터 시작)
        const itemGX = Math.floor(Math.random() * GRID_DIVISIONS);
        const itemGY = Math.floor(Math.random() * GRID_DIVISIONS);
        itemRef.current = { gx: itemGX, gy: itemGY, value: 50, type: 'point' };
        boxCountRef.current = 0;

        const startTime = performance.now();
        // 초기 버그 생성 (4개 모서리 영구 버그: 중앙으로 향함)
        bugsRef.current = [
            { id: ++nextBugIdRef.current, x: STEP, y: STEP, vx: INITIAL_BUG_SPEED, vy: INITIAL_BUG_SPEED, radius: BUG_SIZE, spawnTime: startTime, isPermanent: true },
            { id: ++nextBugIdRef.current, x: CANVAS_SIZE - STEP, y: STEP, vx: -INITIAL_BUG_SPEED, vy: INITIAL_BUG_SPEED, radius: BUG_SIZE, spawnTime: startTime, isPermanent: true },
            { id: ++nextBugIdRef.current, x: STEP, y: CANVAS_SIZE - STEP, vx: INITIAL_BUG_SPEED, vy: -INITIAL_BUG_SPEED, radius: BUG_SIZE, spawnTime: startTime, isPermanent: true },
            { id: ++nextBugIdRef.current, x: CANVAS_SIZE - STEP, y: CANVAS_SIZE - STEP, vx: -INITIAL_BUG_SPEED, vy: -INITIAL_BUG_SPEED, radius: BUG_SIZE, spawnTime: startTime, isPermanent: true }
        ];
        scoreRef.current = 0;
        lastSplitTimeRef.current = startTime;

        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(gameLoop);
    }, []);

    const endGame = useCallback(() => {
        setPhase("result");
        setFinalScore(scoreRef.current);
        setActiveKeys({});
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

        // 1. 버그 분열 로직 (2초마다)
        const dt = time - lastSplitTimeRef.current;

        if (dt >= SPLIT_INTERVAL) {
            lastSplitTimeRef.current = time;
            const currentBugs = bugsRef.current;
            const newBugs: Bug[] = [];

            // 파란버그가 주기마다 점수에 따라 분열 개수 증가
            let minSpawns = 1;
            let maxSpawns = 2;
            if (scoreRef.current >= 2000) {
                minSpawns = 3;
                maxSpawns = 4;
            } else if (scoreRef.current >= 1000) {
                minSpawns = 2;
                maxSpawns = 3;
            }

            for (const b of currentBugs) {
                if (b.isPermanent) {
                    const numSpawns = Math.floor(Math.random() * (maxSpawns - minSpawns + 1)) + minSpawns;
                    for (let i = 0; i < numSpawns; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = SPLIT_BUG_SPEED;

                        newBugs.push({
                            id: ++nextBugIdRef.current,
                            x: b.x,
                            y: b.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            radius: BUG_SIZE * 0.5, // 분열된 버그는 약간 작게
                            spawnTime: time
                            // isPermanent: false (기본값)
                        });
                    }
                }
            }

            bugsRef.current.push(...newBugs);
            scoreRef.current += newBugs.length;
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
        ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";
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

        // --- 보너스 아이템 박스 렌더링 (플레이어와 버그보다 아래에 위치하도록 먼저 그림) ---
        if (itemRef.current) {
            const it = itemRef.current;
            const ix = it.gx * STEP + STEP / 2;
            const iy = it.gy * STEP + STEP / 2;
            const iSize = STEP - 2; // 칸에 꽉 차게

            // 아이템 타입에 따른 색상 결정
            let boxColor = "#fbbf24"; // 기본 골드
            let label = it.value.toString();

            if (it.type === 'cleaner') {
                boxColor = "#a855f7"; // 보라색 (클리너)
                label = "???";
            } else {
                // 먹은 개수에 따른 동/은/금 진화 (0개 먹었을 때 동색, 1개 먹었을 때 은색, 2개 먹었을 때 금색)
                if (boxCountRef.current === 0) boxColor = "#b45309"; // Bronze
                else if (boxCountRef.current === 1) boxColor = "#94a3b8"; // Silver
                else boxColor = "#fbbf24"; // Gold
            }

            ctx.save();
            ctx.translate(ix, iy);

            // 상자 디자인
            ctx.fillStyle = boxColor;
            ctx.fillRect(-iSize / 2, -iSize / 2, iSize, iSize);

            // 테두리
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.lineWidth = 1;
            ctx.strokeRect(-iSize / 2, -iSize / 2, iSize, iSize);

            // 점수 텍스트 (숫자 크게)
            ctx.fillStyle = (it.type === 'point' && boxCountRef.current === 1) ? "#000000" : "#ffffff";
            if (it.type === 'point' && boxCountRef.current === 2) ctx.fillStyle = "#000000"; // Gold에는 검정 글씨
            if (it.type === 'point' && boxCountRef.current === 0) ctx.fillStyle = "#ffffff"; // Bronze에는 흰 글씨
            if (it.type === 'cleaner') ctx.fillStyle = "#ffffff"; // Purple에는 흰 글씨

            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, 0, 0);

            ctx.restore();
        }

        // 1.5. 시간차(DeltaTime)를 이용한 프레임 독립 이동 (60FPS 기준 정규화)
        // 144Hz 등 고주사율 모니터에서도 벌레 속도가 일정하도록 보정합니다.
        if (lastFrameTimeRef.current === 0) lastFrameTimeRef.current = time;
        const deltaTimeMult = Math.min(2.0, (time - lastFrameTimeRef.current) / (1000 / 60)) || 1;
        lastFrameTimeRef.current = time;

        // 4. 버그 이동 및 충돌 체크
        let isGameOver = false;

        // 내 캐릭터(보라색 사각형) 렌더링 - 그리드 칸에 맞게
        const p = playerRef.current;
        const pSize = STEP - 4; // 칸보다 약간 작게 실선 처리
        const halfSize = pSize / 2;

        // 미세하게 떨리는 효과 약간 부여 (겁에 질림)
        const shakeX = (Math.random() - 0.5) * 0.4;
        const shakeY = (Math.random() - 0.5) * 0.4;

        ctx.save();
        ctx.translate(p.x + shakeX, p.y + shakeY);

        // 1. 몸체 (사각형 그라데이션)
        const pGradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
        pGradient.addColorStop(0, "#c084fc"); // purple-400
        pGradient.addColorStop(1, "#8b5cf6"); // purple-600

        ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
        ctx.shadowBlur = 10;

        // 둥근 사각형 몸체
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(-halfSize + r, -halfSize);
        ctx.lineTo(halfSize - r, -halfSize);
        ctx.quadraticCurveTo(halfSize, -halfSize, halfSize, -halfSize + r);
        ctx.lineTo(halfSize, halfSize - r);
        ctx.quadraticCurveTo(halfSize, halfSize, halfSize - r, halfSize);
        ctx.lineTo(-halfSize + r, halfSize);
        ctx.quadraticCurveTo(-halfSize, halfSize, -halfSize, halfSize - r);
        ctx.lineTo(-halfSize, -halfSize + r);
        ctx.quadraticCurveTo(-halfSize, -halfSize, -halfSize + r, -halfSize);
        ctx.fillStyle = pGradient;
        ctx.fill();
        ctx.closePath();

        // 캐릭터 눈 (사각형 얼굴에 맞게 조정)
        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(-4, -2, 4, 0, Math.PI * 2);
        ctx.arc(4, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(-4, -2, 1.5, 0, Math.PI * 2);
        ctx.arc(4, -2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        // 덜덜 떠는 입
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-3, 6);
        ctx.lineTo(3, 6); // 입을 고정 시킴
        ctx.stroke();
        ctx.closePath();

        // 식은땀
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.moveTo(8, -10);
        ctx.lineTo(10, -6);
        ctx.lineTo(6, -6);
        ctx.fill();
        ctx.closePath();

        ctx.restore();

        const activeBugs = [...bugsRef.current];
        const bugsToRemove = new Set<number>();

        // 1단계: 버그 이동 및 벽 충돌
        const WALL_MARGIN = 4;
        for (const b of activeBugs) {
            b.x += b.vx * deltaTimeMult;
            b.y += b.vy * deltaTimeMult;

            const hitLeft = b.x < b.radius + WALL_MARGIN;
            const hitRight = b.x > CANVAS_SIZE - b.radius - WALL_MARGIN;
            const hitTop = b.y < b.radius + WALL_MARGIN;
            const hitBottom = b.y > CANVAS_SIZE - b.radius - WALL_MARGIN;

            if (hitLeft || hitRight || hitTop || hitBottom) {
                if (b.isPermanent) {
                    // 영구 벌레(파란색)는 튕김
                    if (hitLeft) { b.x = b.radius + WALL_MARGIN; b.vx = Math.abs(b.vx); }
                    else if (hitRight) { b.x = CANVAS_SIZE - b.radius - WALL_MARGIN; b.vx = -Math.abs(b.vx); }
                    if (hitTop) { b.y = b.radius + WALL_MARGIN; b.vy = Math.abs(b.vy); }
                    else if (hitBottom) { b.y = CANVAS_SIZE - b.radius - WALL_MARGIN; b.vy = -Math.abs(b.vy); }
                } else {
                    // 일반 벌레(빨간색)는 벽에 닿으면 즉시 소멸 (단, 0.2초 무적 기간 동안은 소멸 제외)
                    const isImmune = (time - b.spawnTime < 200);
                    if (!isImmune) {
                        bugsToRemove.add(b.id);
                    }
                }
            }
        }

        // 2단계: 버그끼리 충돌 체크 (부딪히면 소멸, 영구 벌레는 생존)
        for (let i = 0; i < activeBugs.length; i++) {
            const b1 = activeBugs[i];
            if (bugsToRemove.has(b1.id)) continue;

            for (let j = i + 1; j < activeBugs.length; j++) {
                const b2 = activeBugs[j];
                if (bugsToRemove.has(b2.id)) continue;

                const dx = b1.x - b2.x;
                const dy = b1.y - b2.y;
                const distSq = dx * dx + dy * dy;
                const minDist = b1.radius + b2.radius;

                // 닿는 순간(<=) 즉시 판정 및 무적 시간을 0.2초로 유지 (생성 시 중첩 파괴 방지)
                if (distSq <= minDist * minDist) {
                    if (time - b1.spawnTime < 200 || time - b2.spawnTime < 200) continue;

                    if (b1.isPermanent && b2.isPermanent) {
                        continue;
                    } else if (b1.isPermanent) {
                        bugsToRemove.add(b2.id);
                    } else if (b2.isPermanent) {
                        bugsToRemove.add(b1.id);
                    } else {
                        // 빨간 버그끼리는 서로 사라지지 않음
                        continue;
                    }
                }
            }
        }

        // 3단계: 소멸된 버그 제외
        if (bugsToRemove.size > 0) {
            bugsRef.current = activeBugs.filter(b => !bugsToRemove.has(b.id));
        }

        // 4단계: 버그 렌더링 및 플레이어 충돌 체크
        // 최신 리스트인 bugsRef.current를 사용합니다.
        for (const b of bugsRef.current) {
            const currentBRadius = b.radius;
            ctx.save();
            ctx.translate(b.x, b.y);

            // 본체 구체 (그라데이션)
            const bGradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, currentBRadius);

            if (b.isPermanent) {
                bGradient.addColorStop(0, "#60a5fa");
                bGradient.addColorStop(1, "#2563eb");
            } else {
                bGradient.addColorStop(0, "#f87171"); // 태어날 때부터 빨간색
                bGradient.addColorStop(1, "#dc2626");
            }

            ctx.beginPath();
            ctx.arc(0, 0, currentBRadius, 0, Math.PI * 2);
            ctx.fillStyle = bGradient;
            ctx.fill();
            ctx.closePath();

            // 하이라이트
            ctx.beginPath();
            ctx.arc(-currentBRadius * 0.3, -currentBRadius * 0.3, currentBRadius * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.fill();
            ctx.closePath();
            ctx.restore();

            // [수정] 플레이어(정사각형) vs 버그(원형) 충돌 체크 (AABB vs Circle)
            // 사용자 요청: 빨간 버그(isPermanent 아님)와 닿았을 때만 게임 오버
            // (단, 0.2초 무적 기간 동안은 캐릭터와 부딪혀도 게임 오버 처리 제외)
            const isImmuneForGameOver = !b.isPermanent && (time - b.spawnTime < 200);

            if (!b.isPermanent && !isImmuneForGameOver) {
                const halfSize = 14;
                const px = playerRef.current.x;
                const py = playerRef.current.y;

                // 사각형 내에서 버그 중심과 가장 가까운 점(closest point) 계산
                const closestX = Math.max(px - halfSize, Math.min(b.x, px + halfSize));
                const closestY = Math.max(py - halfSize, Math.min(b.y, py + halfSize));

                // 그 가까운 점과 버그 중심 사이의 거리 확인
                const cdx = b.x - closestX;
                const cdy = b.y - closestY;
                const hitDistSq = cdx * cdx + cdy * cdy;

                // 닿는 순간(<=) 즉시 게임오버
                if (hitDistSq <= b.radius * b.radius) {
                    isGameOver = true;
                }
            }
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

            // 보너스 아이템 획득 체크
            if (itemRef.current && itemRef.current.gx === gx && itemRef.current.gy === gy) {
                const it = itemRef.current;

                if (it.type === 'cleaner') {
                    // 보라색 경로 초기화
                    visitedRef.current.clear();
                    visitedRef.current.add(key); // 현재 위치는 유지
                    boxCountRef.current = 0;
                } else {
                    scoreRef.current += it.value;
                    boxCountRef.current++;
                }

                // 다음 아이템 결정
                const nextType = boxCountRef.current >= 3 ? 'cleaner' : 'point';

                // 다음 아이템 위치 결정 (아직 방문하지 않은 곳 우선)
                let attempts = 0;
                let nextGX, nextGY;
                do {
                    nextGX = Math.floor(Math.random() * GRID_DIVISIONS);
                    nextGY = Math.floor(Math.random() * GRID_DIVISIONS);
                    attempts++;
                } while (visitedRef.current.has(`${nextGX},${nextGY}`) && attempts < 100);

                itemRef.current = { gx: nextGX, gy: nextGY, value: 50, type: nextType };
            }
        }
    }, [phase]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (phase === "playing") {
                if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                    e.preventDefault();
                    if (e.repeat) return;
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
                    <div className="relative rounded-2xl border border-border bg-card overflow-hidden w-full flex flex-col p-0 gap-0 transition-all duration-300">


                        {/* 게임 영역 */}
                        <div
                            className={`relative w-full mx-auto aspect-square bg-slate-50 dark:bg-zinc-950 rounded-none overflow-hidden shadow-inner border-[6px] border-slate-200 dark:border-zinc-900 transition-all duration-300 ${showControls ? 'max-w-[480px]' : 'max-w-[640px] my-4'}`}
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
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 dark:bg-zinc-900/60 backdrop-blur-[1px] p-4 cursor-pointer transition-colors group">
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
                        {showControls && (
                            <div className="flex flex-col items-center justify-center w-full max-w-[480px] mx-auto pt-4 pb-4 px-2 gap-2 animate-in slide-in-from-bottom-2 duration-300">
                                {/* 윗줄: 상 */}
                                <div className="flex justify-center w-full">
                                    <Button
                                        variant={activeKeys["ArrowUp"] ? "default" : "secondary"}
                                        size="icon"
                                        className={`w-24 sm:w-32 h-16 rounded-2xl shadow-xl transition-transform select-none touch-none ${activeKeys["ArrowUp"] ? "scale-90" : "hover:scale-105"}`}
                                        onContextMenu={(e) => e.preventDefault()}
                                        onPointerDown={(e) => {
                                            e.currentTarget.setPointerCapture(e.pointerId);
                                            movePlayer(0, -1);
                                            setActiveKeys(prev => ({ ...prev, ArrowUp: true }));
                                        }}
                                        onPointerUp={(e) => {
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            setActiveKeys(prev => ({ ...prev, ArrowUp: false }));
                                        }}
                                        onPointerCancel={(e) => {
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            setActiveKeys(prev => ({ ...prev, ArrowUp: false }));
                                        }}
                                    >
                                        <ChevronDown className="w-10 h-10 rotate-180" />
                                    </Button>
                                </div>

                                {/* 아랫줄: 좌 하 우 */}
                                <div className="flex justify-center gap-2 w-full">
                                    <Button
                                        variant={activeKeys["ArrowLeft"] ? "default" : "secondary"}
                                        size="icon"
                                        className={`w-24 sm:w-32 h-16 rounded-2xl shadow-xl transition-transform select-none touch-none ${activeKeys["ArrowLeft"] ? "scale-90" : "hover:scale-105"}`}
                                        onContextMenu={(e) => e.preventDefault()}
                                        onPointerDown={(e) => {
                                            e.currentTarget.setPointerCapture(e.pointerId);
                                            movePlayer(-1, 0);
                                            setActiveKeys(prev => ({ ...prev, ArrowLeft: true }));
                                        }}
                                        onPointerUp={(e) => {
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            setActiveKeys(prev => ({ ...prev, ArrowLeft: false }));
                                        }}
                                        onPointerCancel={(e) => {
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            setActiveKeys(prev => ({ ...prev, ArrowLeft: false }));
                                        }}
                                    >
                                        <ChevronDown className="w-10 h-10 rotate-90" />
                                    </Button>
                                    <Button
                                        variant={activeKeys["ArrowDown"] ? "default" : "secondary"}
                                        size="icon"
                                        className={`w-24 sm:w-32 h-16 rounded-2xl shadow-xl transition-transform select-none touch-none ${activeKeys["ArrowDown"] ? "scale-90" : "hover:scale-105"}`}
                                        onContextMenu={(e) => e.preventDefault()}
                                        onPointerDown={(e) => {
                                            e.currentTarget.setPointerCapture(e.pointerId);
                                            movePlayer(0, 1);
                                            setActiveKeys(prev => ({ ...prev, ArrowDown: true }));
                                        }}
                                        onPointerUp={(e) => {
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            setActiveKeys(prev => ({ ...prev, ArrowDown: false }));
                                        }}
                                        onPointerCancel={(e) => {
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            setActiveKeys(prev => ({ ...prev, ArrowDown: false }));
                                        }}
                                    >
                                        <ChevronDown className="w-10 h-10" />
                                    </Button>
                                    <Button
                                        variant={activeKeys["ArrowRight"] ? "default" : "secondary"}
                                        size="icon"
                                        className={`w-24 sm:w-32 h-16 rounded-2xl shadow-xl transition-transform select-none touch-none ${activeKeys["ArrowRight"] ? "scale-90" : "hover:scale-105"}`}
                                        onContextMenu={(e) => e.preventDefault()}
                                        onPointerDown={(e) => {
                                            e.currentTarget.setPointerCapture(e.pointerId);
                                            movePlayer(1, 0);
                                            setActiveKeys(prev => ({ ...prev, ArrowRight: true }));
                                        }}
                                        onPointerUp={(e) => {
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            setActiveKeys(prev => ({ ...prev, ArrowRight: false }));
                                        }}
                                        onPointerCancel={(e) => {
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            setActiveKeys(prev => ({ ...prev, ArrowRight: false }));
                                        }}
                                    >
                                        <ChevronDown className="w-10 h-10 -rotate-90" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* 하단 유틸리티 영역: 큰 화면에서만 표시되는 컨트롤 토글 */}
                        <div className="hidden lg:flex justify-center p-3 border-t border-border bg-muted/10">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowControls(!showControls);
                                }}
                                className="text-[11px] font-black text-primary hover:underline px-4 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10 transition-colors"
                            >
                                {showControls ? "방향키 버튼 숨기기(화면 크게 보기)" : "방향키 버튼 보이기"}
                            </button>
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
                                    const myRank = (displayScore !== undefined && myRankIndex !== -1) ? myRankIndex + 1 : null;
                                    return (
                                        <KakaoShareButton userName={userName} gameTitle={title!} gameUrl="/plays/bug-game" displayScore={displayScore} rank={myRank} />
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
                        <span><strong>방향키 또는 버튼으로 캐릭터를 움직이세요.</strong></span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-primary font-bold shrink-0">02</span>
                        <span><strong>2초마다 빨간 덩어리가 생성돼요. <br />덩어리가 벽이나 파란색 덩어리에 닿으면 사라져요.</strong></span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-primary font-bold shrink-0">03</span>
                        <span><strong>캐릭터가 빨간 덩어리와 부딪히면 끝나요.</strong></span>
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
