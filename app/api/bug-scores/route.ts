import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data: scores, error } = await supabase
        .from("bug_scores")
        .select("user_name, score, created_at")
        .order("score", { ascending: false })
        .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(scores);
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
        .select("id, score")
        .eq("user_id", user.id)
        .maybeSingle();

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let upsertError;

    if (!existingData) {
        // 첫 기록 삽입
        const { error } = await supabase.from("bug_scores").insert({
            user_id: user.id,
            user_name: userName,
            score: body.score,
            created_at: new Date().toISOString()
        });
        upsertError = error;
    } else {
        // 기존 기록이 있을 시 최고 점수(높을수록 좋음) 업데이트
        if (body.score > existingData.score) {
            const { error } = await supabase
                .from("bug_scores")
                .update({
                    score: body.score,
                    user_name: userName,
                    updated_at: new Date().toISOString()
                })
                .eq("id", existingData.id);
            upsertError = error;
        }
    }

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
