import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

// GET: 상위 100개 랭킹 조회 (중복 제거된 가장 짧은 시간 기준)
export async function GET() {
    noStore();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("touch_scores")
        .select("user_name, score, created_at")
        .order("score", { ascending: true }) // 시간은 짧을수록 좋으므로 ASC
        .order("created_at", { ascending: false }) // 동점 시 나중에 달성한 사람 우선
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

// POST: 점수 저장 (최단 기록일 때만 갱신)
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

    // 현재 저장된 최고 기록 확인
    const { data: existingData } = await supabase
        .from("touch_scores")
        .select("score, play_count")
        .eq("user_id", user.id)
        .order("score", { ascending: true }) // 가장 짧은 시간 확인
        .limit(1);

    const existing = existingData?.[0];
    const playCount = (existing?.play_count ?? 0) + 1;

    if (existing && existing.score <= score) { // 더 짧은 시간(더 좋은 기록)이면 무시
        // 단지 플레이 횟수만 업데이트
        await supabase
            .from("touch_scores")
            .update({ play_count: playCount, updated_at: new Date().toISOString() })
            .eq("user_id", user.id);
        return NextResponse.json({ ok: true, message: "Not a personal record, play_count updated" });
    }

    // 새 기록이거나 더 단축된 시간인 경우 저장
    const { error: upsertError } = await supabase
        .from("touch_scores")
        .upsert(
            {
                user_id: user.id,
                user_name: userName,
                score: score,
                play_count: playCount,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
        );

    if (upsertError) {
        // Fallback for duplicates
        await supabase.from("touch_scores").delete().eq("user_id", user.id);
        const { error: insertError } = await supabase
            .from("touch_scores")
            .insert({
                user_id: user.id,
                user_name: userName,
                score,
                play_count: playCount,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            });

        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}

// DELETE: 랭킹 초기화 (관리자 전용)
export async function DELETE() {
    const supabase = await createClient();
    const { error } = await supabase
        .from("touch_scores")
        .delete()
        .not("id", "is", null);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
