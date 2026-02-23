import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: 상위 10개 랭킹 조회
export async function GET() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("chosung_scores")
        .select("user_name, score, created_at")
        .order("score", { ascending: false })
        .limit(10);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
}

// POST: 점수 저장
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

    const { error } = await supabase
        .from("chosung_scores")
        .insert({ user_id: user.id, user_name: userName, score });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
