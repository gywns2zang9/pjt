"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, AlertCircle, Lightbulb, Trophy, X, ChevronDown, Lock } from "lucide-react";
import type { ProjectProps } from "@/components/project-registry";
import { Button } from "@/components/ui/button";
import { KakaoShareButton } from "@/components/kakao-share-button";
import { Portal } from "@/components/portal";

interface RankEntry {
    user_name: string;
    score: number;
    created_at: string;
}

export function CircleGame({ userName, title }: ProjectProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // 점수 계산을 위한 상태
    const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
    const [score, setScore] = useState<number | null>(null);
    const [feedbacks, setFeedbacks] = useState<{ id: number, text: string, type: "error" | "warning" | "success" | "info" }[]>([]);

    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [showAllRanking, setShowAllRanking] = useState(false);

    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/circle-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    // Space 키 지원
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 입력창(게시판 등)에서 입력 중일 때는 단축키 비활성화
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

            if (e.code === "Space" && score !== null) {
                e.preventDefault();
                clearCanvas();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [score]);

    const CANVAS_WIDTH = 600;
    const CANVAS_HEIGHT = 400;
    const CENTER_X = CANVAS_WIDTH / 2;
    const CENTER_Y = CANVAS_HEIGHT / 2;
    const TARGET_RADIUS = 5;
    const MIN_RADIUS = 100; // 인정되는 가이드라인 최소 반지름

    const drawCenterPoint = useCallback((ctx: CanvasRenderingContext2D) => {
        // 중심 빨간 점
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, TARGET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444"; // red-500
        ctx.fill();
        ctx.closePath();

        // 최소 크기 가이드라인 (연한 점선)
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, MIN_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(100, 116, 139, 0.2)"; // 아주 연한 slate 색상
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 10]); // 10px 길이의 점선
        ctx.stroke();
        ctx.setLineDash([]); // 다른 선에 영향 안가게 초기화
        ctx.closePath();
    }, [CENTER_X, CENTER_Y, TARGET_RADIUS, MIN_RADIUS]);

    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set display size (css pixels)
        canvas.style.width = `${CANVAS_WIDTH}px`;
        canvas.style.height = `${CANVAS_HEIGHT}px`;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = CANVAS_WIDTH * dpr;
        canvas.height = CANVAS_HEIGHT * dpr;

        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        drawCenterPoint(ctx);
    }, [CANVAS_WIDTH, CANVAS_HEIGHT, drawCenterPoint]);

    useEffect(() => {
        initCanvas();
    }, [initCanvas]);

    const clearCanvas = () => {
        initCanvas();
        setPoints([]);
        setScore(null);
        setFeedbacks([]);
    };

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX = 0;
        let clientY = 0;

        if ("touches" in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        // 이미 결과가 나왔다면 터치/클릭으로는 재설정 불가 (버튼/Space 만 지원)
        if (score !== null) return;

        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        setPoints([{ x, y }]);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        if (e.cancelable) {
            e.preventDefault();
        }

        const { x, y } = getCoordinates(e);
        setPoints((prev) => [...prev, { x, y }]);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#3b82f6"; // text-blue-500

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const calculateScore = (currentPoints: { x: number, y: number }[]) => {
        if (currentPoints.length < 20) {
            setScore(0);
            setFeedbacks([{ id: 1, text: "원을 끝까지 그려주세요.", type: "error" }]);
            return;
        }

        // --- 1. 사용자가 그린 원의 실제 중심점 찾기 ---
        let sumX = 0;
        let sumY = 0;
        for (const p of currentPoints) {
            sumX += p.x;
            sumY += p.y;
        }
        const drawnCenterX = sumX / currentPoints.length;
        const drawnCenterY = sumY / currentPoints.length;

        // --- 2. 그려진 중심을 기준으로 한 반지름 및 찌그러짐 계산 (Shape) ---
        let sumR = 0;
        const distances = currentPoints.map(p => {
            const dx = p.x - drawnCenterX;
            const dy = p.y - drawnCenterY;
            const d = Math.sqrt(dx * dx + dy * dy);
            sumR += d;
            return d;
        });

        const avgR = sumR / currentPoints.length;

        // 크기 평가 (20점 만점)
        let sizeScore = 20;
        if (avgR < MIN_RADIUS) {
            sizeScore = (avgR / MIN_RADIUS) * 20;
        }
        sizeScore = parseFloat(sizeScore.toFixed(1));

        // 폐합 유무 평가 (20점 만점) - 그려진 중심 기준
        let totalAngle = 0;
        for (let i = 1; i < currentPoints.length; i++) {
            const p1 = currentPoints[i - 1];
            const p2 = currentPoints[i];
            const a1 = Math.atan2(p1.y - drawnCenterY, p1.x - drawnCenterX);
            const a2 = Math.atan2(p2.y - drawnCenterY, p2.x - drawnCenterX);
            let diff = a2 - a1;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            totalAngle += diff;
        }

        // 360도(2π)를 기준으로 부족하거나 넘친 각도를 계산합니다.
        const absTotalAngle = Math.abs(totalAngle);
        const diffAngle = Math.abs(2 * Math.PI - absTotalAngle); // 모자라든 넘치든 오차 각도

        // 오차 각도를 호의 길이(픽셀 단위 거리)로 변환
        const gap = diffAngle * avgR;

        let gapScore = 20;
        // 10px(시작점 근처)까지의 오차는 닫은 것으로 허용하여 만점, 그 이상 벗어나거나 겹쳐 그리면 감점
        if (gap > 10) {
            gapScore = Math.max(0, 20 - ((gap - 10) / avgR) * 20);
        }
        gapScore = parseFloat(gapScore.toFixed(1));

        // 찌그러짐 평가 (50점 만점)
        let varianceSum = 0;
        for (const d of distances) {
            varianceSum += Math.pow(d - avgR, 2);
        }
        const stdDev = Math.sqrt(varianceSum / currentPoints.length);
        const shapeErrorRatio = stdDev / avgR;

        let shapeScore = 50;
        shapeScore = Math.max(0, 50 - (shapeErrorRatio * 50));
        shapeScore = parseFloat(shapeScore.toFixed(1));

        // 중심 일치도 평가 (10점 만점)
        // 화면 정중앙(빨간 점)과 내가 그린 원의 중심점 사이의 거리
        const centerDistance = Math.sqrt(Math.pow(drawnCenterX - CENTER_X, 2) + Math.pow(drawnCenterY - CENTER_Y, 2));
        let centerScore = 10;
        // 허용치를 5px로 줄여 조금만 엇나가도 감점
        if (centerDistance > 5) {
            centerScore = Math.max(0, 10 - ((centerDistance - 5) / 100) * 10);
        }
        centerScore = parseFloat(centerScore.toFixed(1));

        // 최종 점수 합산 (20 + 20 + 50 + 10 = 100점 만점)
        let finalScore = sizeScore + gapScore + shapeScore + centerScore;
        finalScore = parseFloat(Math.max(0, Math.min(100, finalScore)).toFixed(1));

        setScore(finalScore);

        // 복수 피드백(팁) 메시지 설정
        const newFeedbacks: typeof feedbacks = [];
        let idCounter = 1;

        if (finalScore >= 100) {
            newFeedbacks.push({ id: idCounter++, text: "축하합니다!", type: "success" });
        } else if (finalScore >= 96) {
            newFeedbacks.push({ id: idCounter++, text: "거의 다 왔어요!", type: "success" });
        } else if (finalScore >= 90) {
            newFeedbacks.push({ id: idCounter++, text: "100점까지 달려볼까요?", type: "success" });
        } else if (finalScore < 30) {
            newFeedbacks.push({ id: idCounter++, text: "처음부터 다시 그려주세요.", type: "error" });
        }

        // 구체적인 감점 요인 (만점이 아닐 때 항상 표시)
        if (sizeScore < 20) {
            newFeedbacks.push({ id: idCounter++, text: `원을 점선보다 크게 그려보세요. (${sizeScore}/20)`, type: "warning" });
        }
        if (gapScore < 20) {
            newFeedbacks.push({ id: idCounter++, text: `시작점과 끝점이 벗어나지 않게 그려보세요. (${gapScore}/20)`, type: "warning" });
        }
        if (shapeScore < 50) {
            newFeedbacks.push({ id: idCounter++, text: `더 동그랗게 그려보세요. (${shapeScore}/50)`, type: "warning" });
        }
        if (centerScore < 10) {
            newFeedbacks.push({ id: idCounter++, text: `중심이 벗어나지 않게 그려보세요. (${centerScore}/10)`, type: "warning" });
        }

        setFeedbacks(newFeedbacks);

        // 서버에 점수 전송 (로그인한 유저만 비동기)
        if (finalScore > 0 && userName !== "비회원") {
            fetch("/api/circle-scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: finalScore }),
            }).then(() => loadRanking()).catch(console.error);
        }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        calculateScore(points);
    };

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
                {/* 1. How to Play (모바일 전용) */}
                <div className="order-1 lg:hidden">
                    <HTPSection />
                </div>

                {/* 2. 게임 영역 (모바일: 2, PC: 왼쪽) */}
                <div className="order-2 lg:flex-1 min-w-0 flex flex-col items-center justify-center p-6 space-y-8 bg-card border rounded-2xl">


                    <div className={`relative border-4 border-solid rounded-3xl overflow-hidden touch-none w-full max-w-[600px] h-[400px] flex items-center justify-center transition-colors
                    ${score !== null ? 'border-primary/50 bg-primary/5' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>

                        {score !== null && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 animate-in zoom-in-75 fade-in duration-300">
                                <div className="flex items-baseline justify-center text-6xl sm:text-7xl font-black text-primary drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] mix-blend-multiply dark:mix-blend-lighten">
                                    <span>{score}</span>
                                    <span className="text-3xl sm:text-4xl text-primary/80 font-bold ml-1">점</span>
                                </div>
                            </div>
                        )}

                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            onTouchCancel={stopDrawing}
                            className="cursor-crosshair w-full h-full block"
                            style={{ maxWidth: `${CANVAS_WIDTH}px`, maxHeight: `${CANVAS_HEIGHT}px` }}
                        />
                    </div>

                    {/* 3. 하단 버튼 영역 (높이 고정으로 레이아웃 흔들림 방지) */}
                    <div className="flex flex-col items-center justify-center w-full max-w-[600px] min-h-[48px]">
                        {score !== null && (
                            <div className="w-full animate-in fade-in slide-in-from-bottom-2">
                                <Button
                                    variant="default"
                                    className="w-full font-bold h-12 text-md transition-all shadow-sm group relative"
                                    onClick={clearCanvas}
                                >
                                    다시 그리기
                                    <span className="hidden sm:inline-flex absolute right-4 items-center gap-1.5 px-1.5 py-0.5 rounded border border-white/30 bg-white/20 text-[10px] font-medium tracking-tight">
                                        Space
                                    </span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. 사이드바 (모바일: 3, 4 PC: 오른쪽) */}
                <div className="order-3 lg:w-64 shrink-0 flex flex-col gap-4">
                    {/* PC 전용 How to Play */}
                    <div className="hidden lg:block">
                        <HTPSection />
                    </div>

                    {/* 랭킹 보드 (PC 1, 모바일 2) */}
                    <div className="order-2 lg:order-1 flex flex-col gap-4">
                        <RankingBoard
                            ranking={ranking}
                            onShowAll={() => setShowAllRanking(true)}
                            score={score}
                            isGuest={userName === "비회원"}
                        />
                    </div>

                    {/* 팁 / 피드백 (PC 2, 모바일 1) */}
                    <div className="order-1 lg:order-2 flex flex-col gap-4">
                        <TipSection feedbacks={feedbacks} isVisible={score !== null && feedbacks.length > 0} />
                    </div>
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
                                            gameUrl="/plays/circle-game"
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
                        <span><strong>빨간 점을 중심으로 하는 원을 그리세요.</strong></span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">02</span>
                        <span><strong>가이드라인보다 원이 작으면 점수가 깎여요. <br /> 찌그러짐, 시작점과 끝점의 위치, 원 중심의 위치를 평가해요.</strong></span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">03</span>
                        <span><strong>시간 제한은 없어요. 예쁘게 그려보세요.</strong></span>
                    </li>
                </ul>
            )}
        </div>
    );
}

function RankingBoard({ ranking, onShowAll, score, isGuest }: { ranking: RankEntry[], onShowAll: () => void, score: number | null, isGuest: boolean }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 relative overflow-hidden">
            <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-sm tracking-wide text-foreground uppercase flex-1">TOP 3</h2>
                {ranking.length > 0 && !isGuest && (
                    <button
                        onClick={onShowAll}
                        className="text-[10px] font-bold text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
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

function TipSection({ feedbacks, isVisible }: { feedbacks: { id: number, text: string, type: "error" | "warning" | "success" | "info" }[], isVisible: boolean }) {
    if (!isVisible) return null;
    return (
        <div className="p-4 rounded-2xl border border-border bg-card/50">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Tip</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{feedbacks.length}</span>
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {feedbacks.map((item) => (
                    <div key={item.id} className={`p-3 rounded-xl border transition-all animate-in slide-in-from-left-2 duration-300 ${item.type === "success" ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        item.type === "warning" ? "bg-orange-400/5 border-orange-400/10 text-orange-600 dark:text-orange-400" :
                            "bg-destructive/5 border-destructive/10 text-destructive"
                        }`}>
                        <div className="flex items-start gap-2">
                            <span className="text-[14px] leading-tight mt-[1px]">
                                {item.type === "success" ? <Sparkles className="w-4 h-4 text-emerald-500" /> : item.type === "error" ? <AlertCircle className="w-4 h-4 text-destructive" /> : <Lightbulb className="w-4 h-4 text-amber-500" />}
                            </span>
                            <p className="text-[13px] font-medium leading-snug">
                                {item.text}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

