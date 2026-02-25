import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

// GET: 상위 10개 랭킹 조회 (중복 제거된 최고 점수 기준)
export async function GET() {
    noStore();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("chosung_scores")
        .select("user_name, score, created_at")
        .order("score", { ascending: false })
        .limit(20); // 좀 더 넉넉히 가져와서 중복 제거 (또는 DB 스키마가 1인 1매칭이라면 불필요)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 단순 조회를 넘어, 1인 1계정 최고 점수만 남기기 (DB 단에서 처리되지 않은 경우 대비)
    const uniqueRankings = data?.reduce((acc: any[], curr) => {
        if (!acc.find(item => item.user_name === curr.user_name)) {
            acc.push(curr);
        }
        return acc;
    }, []).slice(0, 10);

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
        .from("chosung_scores")
        .select("score")
        .eq("user_id", user.id)
        .order("score", { ascending: false })
        .limit(1);

    const existing = existingData?.[0];

    if (existing && existing.score >= score) {
        return NextResponse.json({ ok: true, message: "Not a personal record" });
    }

    // 새 기록이거나 더 높은 점수인 경우 저장
    // upsert를 시도하되, 실패하면 내 점수보다 낮은 기록들을 삭제하고 새로 insert하는 방식으로 대응
    const { error: upsertError } = await supabase
        .from("chosung_scores")
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
        console.error("Upsert failed, falling back to delete-insert:", upsertError);
        // upsert가 실패하는 주된 원인은 unique 제약조건 부재입니다.
        // 이 경우 기존 내 점수들을 삭제하고 새 점수를 넣습니다.
        await supabase.from("chosung_scores").delete().eq("user_id", user.id);
        const { error: insertError } = await supabase
            .from("chosung_scores")
            .insert({ user_id: user.id, user_name: userName, score });

        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
