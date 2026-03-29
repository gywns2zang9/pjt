import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data: scores, error } = await supabase
        .from("bug_scores")
        .select("user_name, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const uniqueRankings = scores?.reduce((acc: any[], curr) => {
        if (!acc.find(item => item.user_name === curr.user_name)) {
            acc.push(curr);
        }
        return acc;
    }, []);
    return NextResponse.json(uniqueRankings ?? []);
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (typeof body.score !== "number" || body.score <= 0) {
        return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    const userName = user.user_metadata?.full_name
        || user.user_metadata?.name
        || user.user_metadata?.preferred_username
        || user.email?.split("@")[0]
        || "익명";

    // 현재 사용자의 최고기록 조회
    const { data: existingData, error: fetchError } = await supabase
        .from("bug_scores")
        .select("id, score, play_count")
        .eq("user_id", user.id)
        .maybeSingle();

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const playCount = (existingData?.play_count ?? 0) + 1;
    let upsertError;

    if (!existingData) {
        // 첫 기록 삽입
        const { error } = await supabase.from("bug_scores").insert({
            user_id: user.id,
            user_name: userName,
            score: body.score,
            play_count: playCount,
            created_at: new Date().toISOString()
        });
        upsertError = error;
    } else {
        // 기존 기록이 있을 시
        if (body.score > existingData.score) {
            // 최고 점수 업데이트 (높을수록 좋음)
            const { error } = await supabase
                .from("bug_scores")
                .update({
                    score: body.score,
                    user_name: userName,
                    play_count: playCount,
                    updated_at: new Date().toISOString()
                })
                .eq("id", existingData.id);
            upsertError = error;
        } else {
            // 점수가 안 좋더라도 플레이 횟수는 플러스
            const { error } = await supabase
                .from("bug_scores")
                .update({
                    play_count: playCount,
                    updated_at: new Date().toISOString()
                })
                .eq("id", existingData.id);
            upsertError = error;
        }
    }

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
