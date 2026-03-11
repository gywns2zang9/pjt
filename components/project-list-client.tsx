"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Gamepad2, Compass } from "lucide-react";
import { STATUS_STYLES, effectiveTitle, effectiveDescription, effectiveSlug, type ProjectConfig } from "@/lib/projects";

type ProjectWithStats = {
    config: ProjectConfig;
    meta: { id: string; title: string; };
    totalPlay: number;
    myPlay: number;
    myRank: number | null;
    totalPlayers: number;
};

type SortOption = "default" | "popular-desc" | "popular-asc" | "my-desc" | "my-asc" | "rank-asc" | "rank-desc";

export default function ProjectListClient({ projects }: { projects: ProjectWithStats[] }) {
    const [sortBy, setSortBy] = useState<SortOption>("default");

    const sortedProjects = [...projects].sort((a, b) => {
        switch (sortBy) {
            case "popular-desc":
                if (b.totalPlay !== a.totalPlay) return b.totalPlay - a.totalPlay;
                break;
            case "popular-asc":
                if (a.totalPlay !== b.totalPlay) return a.totalPlay - b.totalPlay;
                break;
            case "my-desc":
                if (b.myPlay !== a.myPlay) return b.myPlay - a.myPlay;
                break;
            case "my-asc":
                if (a.myPlay !== b.myPlay) return a.myPlay - b.myPlay;
                break;
            case "rank-asc": {
                // 등수 낮은 순 (1등이 먼저) — 기록 없는 사람은 뒤로
                const ra = a.myRank ?? Infinity;
                const rb = b.myRank ?? Infinity;
                if (ra !== rb) return ra - rb;
                break;
            }
            case "rank-desc": {
                // 등수 높은 순 (꼴등이 먼저) — 기록 없는 사람은 뒤로
                const ra = a.myRank ?? -1;
                const rb = b.myRank ?? -1;
                if (ra !== rb) return rb - ra;
                break;
            }
        }
        // 기본 정렬: sort_order
        const orderA = a.config.sort_order ?? 0;
        const orderB = b.config.sort_order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return b.totalPlay - a.totalPlay;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-md w-fit inline-flex items-center">
                    총 <span className="text-foreground font-bold mx-1">{projects.length}</span>개의 콘텐츠
                </p>

                {/* Sort Dropdown */}
                <div className="relative group w-full sm:w-auto">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full sm:w-auto appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium pl-4 pr-10 py-2.5 sm:py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                        <option value="default">기본순</option>
                        <option value="popular-desc">인기 많은 순</option>
                        <option value="popular-asc">인기 적은 순</option>
                        <option value="rank-asc">등수 높은 순</option>
                        <option value="rank-desc">등수 낮은 순</option>
                        <option value="my-desc">많이 시도한 순</option>
                        <option value="my-asc">적게 시도한 순</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {sortedProjects.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground text-sm border border-dashed rounded-2xl">
                    공개된 작업물이 없어요
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {sortedProjects.map(({ meta, config, totalPlay, myPlay, myRank, totalPlayers }) => {
                        const statusStyle = STATUS_STYLES[config.status];
                        const title = effectiveTitle(meta, config);
                        const description = effectiveDescription(config);
                        const slug = effectiveSlug(meta, config);

                        return (
                            <Link
                                key={meta.id}
                                href={`/works/${slug}`}
                                className="group block rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                                                {title}
                                            </h2>
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold tracking-wider ${statusStyle.className} shrink-0`}
                                            >
                                                {statusStyle.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                            {description}
                                        </p>

                                        {/* Play Stats Row */}
                                        <div className="flex items-center flex-wrap gap-2 pt-2 text-[11px] font-medium text-muted-foreground/80">
                                            {/* {totalPlay > 0 && (
                                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/40 px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400">
                                                    <Compass className="w-3.5 h-3.5 text-slate-400" />
                                                    총 플레이 {totalPlay.toLocaleString()}회
                                                </div>
                                            )} */}
                                            {myPlay > 0 && (
                                                <div className="inline-flex items-center gap-1.5 bg-primary/5 dark:bg-primary/10 px-2 py-1 rounded-md text-primary/80 dark:text-primary/70">
                                                    <Gamepad2 className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                                                    <span className="text-[11px] font-semibold tracking-wide whitespace-nowrap">{myPlay.toLocaleString()}회</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rank */}
                                    {myRank !== null && totalPlayers > 0 && (
                                        <div className="shrink-0 text-right">
                                            <span className="text-2xl font-black text-foreground tabular-nums">{myRank}</span>
                                            <span className="text-xs text-muted-foreground font-medium">등 / {totalPlayers}명</span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
