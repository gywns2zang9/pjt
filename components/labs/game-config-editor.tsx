"use client";

import { useState, useTransition } from "react";
import { type GameConfig } from "@/components/games/chosung-game";
import { updateProjectConfig } from "@/app/labs/actions";

interface Props {
    projectId: string;
    initial: GameConfig;
}

const PRESETS = [
    { label: "기본 (5초)", config: { gameDuration: 5, breakDuration: 1500, numConsonants: 2 } },
    { label: "빠름 (3초)", config: { gameDuration: 3, breakDuration: 1000, numConsonants: 2 } },
    { label: "느긋 (8초)", config: { gameDuration: 8, breakDuration: 2000, numConsonants: 2 } },
    { label: "어려움 (5초/3글자)", config: { gameDuration: 5, breakDuration: 1500, numConsonants: 3 } },
];

export function GameConfigEditor({ projectId, initial }: Props) {
    const [cfg, setCfg] = useState<GameConfig>(initial);
    const [isPending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        startTransition(async () => {
            try {
                await updateProjectConfig(projectId, { game_config: cfg } as never);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } catch { /* ignore */ }
        });
    };

    const applyPreset = (config: GameConfig) => {
        setCfg(config);
    };

    return (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">🎮 게임 설정</h3>
                <span className="text-xs text-muted-foreground/60 font-mono">chosung-game</span>
            </div>

            {/* 프리셋 */}
            <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">빠른 프리셋</p>
                <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                        <button
                            key={p.label}
                            onClick={() => applyPreset(p.config as GameConfig)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 직접 설정 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-foreground">라운드 시간</p>
                        <p className="text-xs text-muted-foreground">{cfg.gameDuration}초</p>
                    </div>
                    <input
                        type="range"
                        min={2}
                        max={15}
                        step={1}
                        value={cfg.gameDuration}
                        onChange={(e) => setCfg((c) => ({ ...c, gameDuration: Number(e.target.value) }))}
                        className="w-32 accent-primary"
                    />
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-foreground">휴식 시간</p>
                        <p className="text-xs text-muted-foreground">{cfg.breakDuration / 1000}초</p>
                    </div>
                    <input
                        type="range"
                        min={500}
                        max={3000}
                        step={500}
                        value={cfg.breakDuration}
                        onChange={(e) => setCfg((c) => ({ ...c, breakDuration: Number(e.target.value) }))}
                        className="w-32 accent-primary"
                    />
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-foreground">초성 개수</p>
                        <p className="text-xs text-muted-foreground">{cfg.numConsonants}글자</p>
                    </div>
                    <div className="flex gap-1.5">
                        {[2, 3, 4].map((n) => (
                            <button
                                key={n}
                                onClick={() => setCfg((c) => ({ ...c, numConsonants: n }))}
                                className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${cfg.numConsonants === n
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={isPending}
                className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${saved
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    }`}
            >
                {isPending ? "저장 중..." : saved ? "✅ 저장됨" : "저장"}
            </button>
        </div>
    );
}
