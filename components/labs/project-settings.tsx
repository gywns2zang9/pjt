"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    updateProjectMeta,
    updateProjectConfig,
    resetChosungRanking,
    resetCircleRanking,
    resetSpeedRanking,
} from "@/app/labs/actions";
import {
    type ProjectMeta,
    type ProjectConfig,
    effectiveTitle,
    effectiveDescription,
    effectiveSlug,
} from "@/lib/projects";
import { type GameConfig } from "@/components/games/chosung-game";

interface Props {
    project: ProjectMeta;
    config: ProjectConfig;
    initialGameConfig: GameConfig;
    hasGameConfig: boolean;
    hasRanking?: boolean;
}

export function ProjectSettings({ project, config: initialConfig, initialGameConfig, hasGameConfig, hasRanking }: Props) {
    const router = useRouter();

    // ── 기본 정보 ──
    const [title, setTitle] = useState(effectiveTitle(project, initialConfig));
    const [desc, setDesc] = useState(effectiveDescription(initialConfig));
    const [slug, setSlug] = useState(effectiveSlug(project, initialConfig));
    const [isSavingMeta, startMetaTransition] = useTransition();
    const [metaSaved, setMetaSaved] = useState(false);

    // ── 게임 설정 ──
    const [gameCfg, setGameCfg] = useState<GameConfig>(initialGameConfig);
    const [isSavingGame, startGameTransition] = useTransition();
    const [gameSaved, setGameSaved] = useState(false);

    // ── 랭킹 초기화 ──
    const [isResetting, startResetTransition] = useTransition();

    const handleSaveMeta = () => {
        startMetaTransition(async () => {
            await updateProjectMeta(project.id, title, desc, slug);
            setMetaSaved(true);
            setTimeout(() => setMetaSaved(false), 2000);
            router.refresh();
        });
    };

    const handleSaveGame = () => {
        startGameTransition(async () => {
            await updateProjectConfig(project.id, { game_config: gameCfg });
            setGameSaved(true);
            setTimeout(() => setGameSaved(false), 2000);
        });
    };

    const handleResetRanking = () => {
        if (!window.confirm("랭킹을 초기화하시겠습니까?\n전체 점수 기록이 삭제되며 복구할 수 없습니다.")) return;
        startResetTransition(async () => {
            if (project.id === "chosung-game") {
                await resetChosungRanking();
            } else if (project.id === "circle-game") {
                await resetCircleRanking();
            } else if (project.id === "speed-test") {
                await resetSpeedRanking();
            }
        });
    };

    return (
        <div className="space-y-6 max-w-xl">

            {/* ── 기본 정보 ── */}
            <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-sm font-semibold text-foreground">기본 정보</h2>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">프로젝트 이름</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={project.title}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">설명</label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="프로젝트 설명 (선택)"
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">URL 경로</label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">/works/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                                placeholder="test"
                                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground/50">
                            영문·숫자·하이픈만 가능 · 미설정 시 <span className="font-mono">{project.id}</span> 사용
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSaveMeta}
                    disabled={isSavingMeta}
                    className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${metaSaved
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        }`}
                >
                    {isSavingMeta ? "저장 중..." : metaSaved ? "✅ 저장됨" : "저장"}
                </button>
            </section>

            {/* ── 게임 설정 ── */}
            {hasGameConfig && (
                <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-foreground">🎮 게임 설정</h2>

                    <div className="space-y-5">
                        {/* 라운드 시간: 1~30초 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground">라운드 시간</label>
                                <span className="text-sm font-bold text-primary tabular-nums">{gameCfg.gameDuration}초</span>
                            </div>
                            <input
                                type="range" min={1} max={30} step={1}
                                value={gameCfg.gameDuration}
                                onChange={(e) => setGameCfg((c) => ({ ...c, gameDuration: Number(e.target.value) }))}
                                className="w-full accent-primary"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground/50">
                                <span>1초</span><span>30초</span>
                            </div>
                        </div>

                        {/* 휴식 시간: 0~5초 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground">라운드 간 휴식</label>
                                <span className="text-sm font-bold text-primary tabular-nums">{(gameCfg.breakDuration / 1000).toFixed(1)}초</span>
                            </div>
                            <input
                                type="range" min={0} max={5000} step={500}
                                value={gameCfg.breakDuration}
                                onChange={(e) => setGameCfg((c) => ({ ...c, breakDuration: Number(e.target.value) }))}
                                className="w-full accent-primary"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground/50">
                                <span>없음</span><span>5초</span>
                            </div>
                        </div>

                        {/* 초성 개수: 1~3 */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">초성 개수</label>
                            <div className="flex gap-2">
                                {[1, 2, 3].map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => setGameCfg((c) => ({ ...c, numConsonants: n }))}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${gameCfg.numConsonants === n
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "border-border text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        {n}글자
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveGame}
                        disabled={isSavingGame}
                        className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${gameSaved
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                            }`}
                    >
                        {isSavingGame ? "저장 중..." : gameSaved ? "✅ 저장됨" : "저장"}
                    </button>
                </section>
            )}

            {/* ── 위험 구역 ── */}
            {hasRanking && (
                <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
                    <h2 className="text-sm font-semibold text-destructive">위험 구역</h2>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-foreground">랭킹 초기화</p>
                            <p className="text-xs text-muted-foreground">전체 점수 기록을 삭제합니다. 복구 불가.</p>
                        </div>
                        <button
                            onClick={handleResetRanking}
                            disabled={isResetting}
                            className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold border border-destructive/50 text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                        >
                            {isResetting ? "삭제 중..." : "초기화"}
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}
