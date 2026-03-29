import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const TABLE_MAP: Record<string, string> = {
        "chosung-game": "chosung_scores",
        "circle-game": "circle_scores",
        "size-game": "size_scores",
        "speed-game": "speed_scores",
        "sort-game": "sort_scores",
        "ddong-game": "ddong_scores",
        "touch-game": "touch_scores",
        "eyes-game": "eyes_scores",
        "arrow-game": "arrow_scores",
        "balloon-game": "balloon_scores",
        "bug-game": "bug_scores",
    };

    const SCORE_ASC = new Set(["speed-game", "sort-game", "touch-game"]);

    const tablesPayload = Object.keys(TABLE_MAP).map(key => ({
        id: key,
        table: TABLE_MAP[key],
        isAsc: SCORE_ASC.has(key)
    }));

    try {
        // 1. 전체 통계를 한 번에 시도 (가장 빠름)
        const { data: statsData, error: rpcError } = await supabase.rpc("get_all_game_stats", {
            p_tables: tablesPayload,
            p_user_id: user?.id ?? null
        });

        if (!rpcError) {
            return NextResponse.json({
                stats: statsData,
                user: user ? {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.user_metadata?.preferred_username ?? user.email?.split("@")[0] ?? "익명"
                } : null
            });
        }

        // 2. RPC 실패 시 (e.g. play_count 컬럼 누락), 개별 테이블별로 안전하게 조회 시도
        console.warn("RPC failed, falling back to individual table stats fetching. Error:", rpcError);

        const individualStats = await Promise.all(
            tablesPayload.map(async (t) => {
                try {
                    // 기본 통계 (플레이 횟수)
                    const { count: totalPlay, error: countErr } = await supabase
                        .from(t.table)
                        .select("*", { count: "exact", head: true });

                    if (countErr) return null;

                    let myPlay = 0;
                    let myRank: number | null = null;
                    let totalPlayers = 0;

                    if (user?.id) {
                        try {
                            // 내 플레이 횟수 (play_count 컬럼이 있으면 사용, 없으면 COUNT(*)로 대체)
                            const { data: userData, error: userErr } = await supabase
                                .from(t.table)
                                .select("play_count, score")
                                .eq("user_id", user.id);

                            if (!userErr && userData && userData.length > 0) {
                                // play_count 컬럼이 있는지 확인 (에러 없이 결과가 왔다면 있는 것)
                                if (userData[0].hasOwnProperty('play_count')) {
                                    myPlay = userData.reduce((sum, row) => sum + (row.play_count || 0), 0);
                                } else {
                                    myPlay = userData.length;
                                }

                                // 랭킹 계산 (간단히 자기보다 높은 점수 사람 수 + 1)
                                const myBestScore = userData.reduce((max, row) => t.isAsc ? Math.min(max, row.score) : Math.max(max, row.score), t.isAsc ? Infinity : -Infinity);

                                const { count: higherCount } = await supabase
                                    .from(t.table)
                                    .select("*", { count: "exact", head: true })
                                    .filter("score", t.isAsc ? "lt" : "gt", myBestScore);

                                myRank = (higherCount ?? 0) + 1;
                            }
                        } catch (innerErr) {
                            console.error(`Failed to fetch user stats for ${t.table}:`, innerErr);
                        }

                        // 명수 계산
                        const { count: distinctPlayers } = await supabase
                            .from(t.table)
                            .select("user_id", { count: "exact", head: true });
                        totalPlayers = distinctPlayers ?? 0;
                    }

                    return {
                        id: t.id,
                        totalPlay: totalPlay ?? 0,
                        myPlay,
                        myRank,
                        totalPlayers
                    };
                } catch (err) {
                    console.error(`Failed to fetch stats for ${t.table}:`, err);
                    return null;
                }
            })
        );

        return NextResponse.json({
            stats: individualStats.filter(s => s !== null),
            user: user ? {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.user_metadata?.preferred_username ?? user.email?.split("@")[0] ?? "익명"
            } : null
        });
    } catch (error) {
        console.error("Critical failure in plays stats:", error);
        return NextResponse.json({ stats: [], user: null });
    }
}
