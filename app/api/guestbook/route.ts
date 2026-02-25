import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { content, is_anonymous } = await req.json();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const realName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "알 수 없음";

        // 1. DB Insert
        const { data, error } = await supabase
            .from("guestbook")
            .insert({
                content,
                user_email: user.email,
                user_id: user.id,
                display_name: realName,
                is_anonymous: is_anonymous,
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Email Notification
        try {
            await resend.emails.send({
                from: "gywns2zang9.dev <onboarding@resend.dev>",
                to: ["gywns2zang9@gmail.com"],
                subject: "방명록을 확인하세요!",
                html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p><strong>작성자:</strong> ${is_anonymous ? "익명 (" + realName + ")" : realName}</p>
            <p><strong>내용:</strong> ${content.replace(/\n/g, "<br/>")}</p>
            <p style="font-size: 13px; color: #666;">
              <a href="https://www.gywns2zang9.dev/" style="color: #0070f3; text-decoration: none; font-weight: bold;">방명록 확인하러 가기 &rarr;</a>
            </p>
          </div>
        `,
            });
            console.log("[Guestbook API] Resend notification sent successfully.");
        } catch (emailError) {
            console.error("[Guestbook API] Email notification failed error:", emailError);
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error("Guestbook submission error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
