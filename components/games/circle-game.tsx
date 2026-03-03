"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { ProjectProps } from "@/components/project-registry";
import { Button } from "@/components/ui/button";

export function CircleGame({ userName }: ProjectProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // 점수 계산을 위한 상태
    const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
    const [score, setScore] = useState<number | null>(null);
    const [feedbacks, setFeedbacks] = useState<{ id: number, text: string, type: "error" | "warning" | "success" | "info" }[]>([]);

    // 랭킹 관리를 위한 상태
    interface RankEntry {
        user_name: string;
        score: number;
        created_at: string;
    }
    const [ranking, setRanking] = useState<RankEntry[]>([]);

    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/circle-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

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
        // 이미 결과가 나왔다면 초기화 후 시작
        if (score !== null) {
            clearCanvas();
        }

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
        shapeScore = Math.max(0, 50 - (shapeErrorRatio * 75));
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

        if (finalScore >= 90) {
            newFeedbacks.push({ id: idCounter++, text: "따라올 사람이 없네요.", type: "success" });
        } else if (finalScore < 30) {
            newFeedbacks.push({ id: idCounter++, text: "이 점수가 나오긴 하네요.ㅋㅋ", type: "error" });
        } else {
            if (sizeScore <= 16) {
                newFeedbacks.push({ id: idCounter++, text: "원을 점선보다 크게 그려보세요.", type: "warning" });
            }
            if (gapScore <= 16) {
                newFeedbacks.push({ id: idCounter++, text: "시작점과 끝점이 많이 벗어났어요.", type: "warning" });
            }
            if (shapeScore <= 40) {
                newFeedbacks.push({ id: idCounter++, text: "더 동그랗게 그려보세요.", type: "warning" });
            }
            if (centerScore <= 8) {
                newFeedbacks.push({ id: idCounter++, text: "중앙에서 벗어났어요.", type: "warning" });
            }

            if (newFeedbacks.length === 0) {
                newFeedbacks.push({ id: idCounter++, text: "이정도면 인정입니다.", type: "success" });
            }
        }

        setFeedbacks(newFeedbacks);

        // 서버에 점수 전송 (비동기)
        if (finalScore > 0) {
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
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
            {/* ── 게임 영역 ── */}
            <div className="flex-1 min-w-0 flex flex-col items-center justify-center p-6 space-y-8 bg-card border rounded-2xl">

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

                <div className="flex flex-col items-center gap-4 w-full max-w-[600px]">
                    {score !== null && (
                        <div className="flex items-center gap-3 w-full">
                            <Button
                                variant="default"
                                className="w-full font-bold h-12 text-md transition-all shadow-sm animate-in fade-in slide-in-from-bottom-2"
                                onClick={clearCanvas}
                            >
                                다시 그리기
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 사이드바: 랭킹 및 히스토리 ── */}
            <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
                {/* 팁 / 피드백 (초성게임 Word History 같은 UI) */}
                {score !== null && feedbacks.length > 0 && (
                    <div className="order-1 lg:order-2 p-4 rounded-2xl border border-border bg-card/50">
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
                                            {item.type === "success" ? "✨" : item.type === "error" ? "🚨" : "💡"}
                                        </span>
                                        <p className="text-[13px] font-medium leading-snug">
                                            {item.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 랭킹 보드 */}
                <div className="order-2 lg:order-1 rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        <h2 className="font-bold text-sm tracking-wide text-foreground uppercase">TOP 3</h2>
                    </div>

                    {ranking.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">
                            아직 기록이 없어요<br />
                        </p>
                    ) : (
                        <ol className="space-y-2">
                            {ranking.slice(0, 3).map((entry, i) => (
                                <li
                                    key={i}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${i === 0
                                        ? "bg-yellow-400/10 border border-yellow-400/25"
                                        : i === 1
                                            ? "bg-slate-400/10 border border-slate-400/20"
                                            : i === 2
                                                ? "bg-orange-400/10 border border-orange-400/20"
                                                : "bg-muted/30"
                                        }`}
                                >
                                    <span className="text-base shrink-0">
                                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{entry.user_name}</p>
                                    </div>
                                    <span className="text-sm font-black text-primary shrink-0">{entry.score}점</span>
                                </li>
                            ))}
                        </ol>
                    )}

                    {score !== null && (
                        <div className="pt-3 border-t border-border animate-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-primary/10 border border-primary/20">
                                <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">Score</span>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-xl font-black text-foreground">{score}점</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
