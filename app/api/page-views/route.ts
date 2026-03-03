import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST: 방문 기록
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const body = await req.json().catch(() => ({}));
    const { path = "/", visitorId } = body;

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("page_views").insert({
        path,
        visitor_id: visitorId ?? null,
        user_id: user?.id ?? null,
    });

    return NextResponse.json({ ok: true });
}

// GET: 총 방문 횟수
export async function GET() {
    const supabase = await createClient();
    const { count } = await supabase
        .from("page_views")
        .select("*", { count: "exact", head: true });

    return NextResponse.json({ count: count ?? 0 });
}
