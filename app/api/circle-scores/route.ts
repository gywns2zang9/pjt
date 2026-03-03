import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

// GET: 상위 10개 랭킹 조회 (중복 제거된 최고 점수 기준)
export async function GET() {
    noStore();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("circle_scores")
        .select("user_name, score, created_at")
        .order("score", { ascending: false })
        .limit(20);

    if (error) {
        // 테이블이 아직 없거나 권한이 없는 경우 빈 배열 반환하여 프론트엔드 에러 방지
        return NextResponse.json([]);
    }

    const uniqueRankings = data?.reduce((acc: any[], curr) => {
        if (!acc.find(item => item.user_name === curr.user_name)) {
            acc.push(curr);
        }
        return acc;
    }, []).slice(0, 3); // 3개만 보여주기

    return NextResponse.json(uniqueRankings ?? []);
}

// POST: 점수 저장 (최고 기록일 때만 갱신)
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
        .from("circle_scores")
        .select("score")
        .eq("user_id", user.id)
        .order("score", { ascending: false })
        .limit(1);

    const existing = existingData?.[0];

    if (existing && existing.score >= score) {
        return NextResponse.json({ ok: true, message: "Not a personal record" });
    }

    // 새 기록이거나 더 높은 점수인 경우 저장
    const { error: upsertError } = await supabase
        .from("circle_scores")
        .upsert(
            {
                user_id: user.id,
                user_name: userName,
                score: score,
                updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
        );

    if (upsertError) {
        await supabase.from("circle_scores").delete().eq("user_id", user.id);
        const { error: insertError } = await supabase
            .from("circle_scores")
            .insert({ user_id: user.id, user_name: userName, score });

        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}

// DELETE: 랭킹 초기화 (관리자 전용, 현재는 누구나 또는 조건부)
export async function DELETE() {
    const supabase = await createClient();
    // 전체 삭제 (id가 null이 아닌 모든 열 삭제 = truncate 효과)
    const { error } = await supabase
        .from("circle_scores")
        .delete()
        .not("id", "is", null);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "랭킹이 초기화되었습니다." });
}
