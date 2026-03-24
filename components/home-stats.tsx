"use client";

import { useEffect, useState } from "react";
import { Counter } from "@/components/home-client";

export function StatItem({ label, value, isLoaded }: { label: string; value: number; isLoaded?: boolean }) {
    return (
        <div className="flex flex-col items-center">
            <span className="text-2xl md:text-5xl font-black text-white italic tabular-nums min-w-[2ch]">
                <Counter value={value} isLoaded={isLoaded} />
            </span>
            <span className="mt-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                {label}
            </span>
        </div>
    );
}

export function HomeStatsFallback() {
    return (
        <div className="grid grid-cols-3 gap-8 md:gap-16">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                    {/* stats placeholder */}
                    <div className="w-12 h-8 md:w-20 md:h-10 bg-slate-800/50 rounded animate-pulse" />
                    <div className="w-10 h-3 bg-slate-800/30 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
}

export default function HomeStats() {
    const [stats, setStats] = useState<{ visitorCount: number; totalPlayCount: number; userCount: number } | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/stats");
                if (!res.ok) throw new Error("Load failed");
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error("HomeStats fetch error:", err);
                setStats({ visitorCount: 0, totalPlayCount: 0, userCount: 0 });
            }
        };
        fetchStats();
    }, []);

    if (!stats) return <HomeStatsFallback />;

    return (
        <div className="grid grid-cols-3 gap-8 md:gap-16">
            <StatItem label="총 방문" value={stats.visitorCount} isLoaded={true} />
            <StatItem label="플레이" value={stats.totalPlayCount} isLoaded={true} />
            <StatItem label="친구들" value={stats.userCount} isLoaded={true} />
        </div>
    );
}
