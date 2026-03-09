import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
    noStore();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ddong_scores")
        .select("user_name, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const uniqueRankings = data?.reduce((acc: any[], curr) => {
        if (!acc.find((item: any) => item.user_name === curr.user_name)) {
            acc.push(curr);
        }
        return acc;
    }, []);

    return NextResponse.json(uniqueRankings ?? []);
}

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

    const { data: existingData } = await supabase
        .from("ddong_scores")
        .select("score")
        .eq("user_id", user.id)
        .order("score", { ascending: false })
        .limit(1);

    if (existingData?.[0] && existingData[0].score >= score) {
        return NextResponse.json({ ok: true, message: "Not a personal record" });
    }

    const { error: upsertError } = await supabase
        .from("ddong_scores")
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
        await supabase.from("ddong_scores").delete().eq("user_id", user.id);
        const { error: insertError } = await supabase
            .from("ddong_scores")
            .insert({ user_id: user.id, user_name: userName, score });

        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
