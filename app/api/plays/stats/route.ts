import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const supabase = await createClient();

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

    try {
        /**
         * 인게임 랭킹 API와 완전히 동일한 방식으로 순위를 계산합니다.
         * 1) score 정렬 + created_at DESC (동점 시 최신자 우선)
         * 2) user_name 기준 1인 1기록 필터
         * 3) 해당 리스트에서 현재 유저 위치 = 순위
         */
        const stats = await Promise.all(
            Object.entries(TABLE_MAP).map(async ([gameId, table]) => {
                try {
                    const isAsc = SCORE_ASC.has(gameId);

                    // 정렬된 전체 랭킹 조회 (인게임 API와 동일한 정렬)
                    const { data, error } = await supabase
                        .from(table)
                        .select("user_id, user_name, score, play_count, created_at")
                        .order("score", { ascending: isAsc })
                        .order("created_at", { ascending: false })
                        .limit(200);

                    if (error || !data) return { id: gameId, totalPlay: 0, myPlay: 0, myRank: null, totalPlayers: 0 };

                    // 유저별 1개만 남기기 (인게임 API와 동일한 reduce 방식)
                    const uniqueRankings = data.reduce((acc: typeof data, curr) => {
                        if (!acc.find(item => item.user_name === curr.user_name)) {
                            acc.push(curr);
                        }
                        return acc;
                    }, []);

                    const totalPlayers = uniqueRankings.length;

                    let myRank: number | null = null;
                    let myPlay = 0;

                    if (user?.id) {
                        // 유저 순위: 정렬된 리스트에서의 인덱스 + 1 (인게임과 동일)
                        const myIndex = uniqueRankings.findIndex(r => r.user_id === user.id);
                        if (myIndex !== -1) {
                            myRank = myIndex + 1;
                            myPlay = uniqueRankings[myIndex].play_count ?? 0;
                        }
                    }

                    return {
                        id: gameId,
                        totalPlay: totalPlayers,
                        myPlay,
                        myRank,
                        totalPlayers
                    };
                } catch (err) {
                    console.error(`Failed to fetch stats for ${table}:`, err);
                    return { id: gameId, totalPlay: 0, myPlay: 0, myRank: null, totalPlayers: 0 };
                }
            })
        );

        return NextResponse.json({
            stats,
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
