import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const revalidate = 300; // 5분 캐시

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const tables = [
        "chosung_scores",
        "circle_scores",
        "ddong_scores",
        "eyes_scores",
        "size_scores",
        "sort_scores",
        "speed_scores",
        "touch_scores",
        "arrow_scores",
        "balloon_scores",
        "bug_scores",
    ];

    const tablesPayload = tables.map((t) => ({ id: t, table: t, isAsc: false }));

    try {
        const [visitorResult, statsResult, userCount] = await Promise.all([
            // 1. 전체 방문자 수 조회
            supabase.from("page_views").select("*", { count: "exact", head: true }),
            // 2. 각 게임별 플레이 횟수 데이터 집계
            supabase.rpc("get_all_game_stats", { p_tables: tablesPayload }),
            // 3. 전체 가입 사용자 수 조회
            (async () => {
                if (!serviceRoleKey) return 0;
                const admin = createClient(supabaseUrl, serviceRoleKey, {
                    auth: { autoRefreshToken: false, persistSession: false },
                });
                const { data } = await admin.auth.admin.listUsers({ perPage: 1 });
                return (data as any)?.total ?? (data as any)?.users?.length ?? 0;
            })(),
        ]);

        const visitorCount = visitorResult.count ?? 0;
        const totalPlayCount = (statsResult.data as any[])?.reduce(
            (sum, item) => sum + (item.totalPlay ?? 0),
            0
        ) ?? 0;

        return NextResponse.json({
            visitorCount,
            totalPlayCount,
            userCount,
        });
    } catch (error) {
        console.error("Failed to fetch stats:", error);
        return NextResponse.json({
            visitorCount: 0,
            totalPlayCount: 0,
            userCount: 0,
        }, { status: 500 });
    }
}
