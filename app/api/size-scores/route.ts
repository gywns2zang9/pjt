import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

// GET: 상위 3개 랭킹 조회 (유저별 최고 점수 기준)
export async function GET() {
    noStore();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("size_scores")
        .select("user_name, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true }) // 동점 시 먼저 달성한 사람 우선
        .limit(100);

    if (error) {
        return NextResponse.json([]);
    }

    const uniqueRankings = data?.reduce((acc: any[], curr) => {
        if (!acc.find(item => item.user_name === curr.user_name)) {
            acc.push(curr);
        }
        return acc;
    }, []);

    return NextResponse.json(uniqueRankings ?? []);
}

// POST: 점수 저장 (최고 기록만 갱신)
export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { score } = await req.json();
    if (typeof score !== "number" || score < 0) {
        return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    const userName =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.user_metadata?.preferred_username ??
        user.email?.split("@")[0] ??
        "익명";

    // 현재 저장된 최고 점수 확인
    const { data: existingData } = await supabase
        .from("size_scores")
        .select("score, play_count")
        .eq("user_id", user.id)
        .order("score", { ascending: false })
        .limit(1);

    const existing = existingData?.[0];
    const playCount = (existing?.play_count ?? 0) + 1;

    if (existing && existing.score >= score) {
        // 단지 플레이 횟수만 업데이트
        await supabase
            .from("size_scores")
            .update({ play_count: playCount, updated_at: new Date().toISOString() })
            .eq("user_id", user.id);
        return NextResponse.json({ ok: true, message: "Not a personal record, play_count updated" });
    }

    const { error: upsertError } = await supabase
        .from("size_scores")
        .upsert(
            {
                user_id: user.id,
                user_name: userName,
                score: score,
                play_count: playCount,
                updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
        );

    if (upsertError) {
        await supabase.from("size_scores").delete().eq("user_id", user.id);
        const { error: insertError } = await supabase
            .from("size_scores")
            .insert({ user_id: user.id, user_name: userName, score, play_count: playCount, updated_at: new Date().toISOString() });

        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
