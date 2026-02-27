import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { content, is_anonymous, project_id } = await req.json();

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
                project_id: project_id || "home",
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Email Notification
        try {
            const isHome = !project_id || project_id === "home";
            const boardName = isHome ? "방명록" : `[${project_id}] 게시판`;
            const redirectUrl = isHome ? "https://www.gywns2zang9.dev/" : `https://www.gywns2zang9.dev/works/${project_id}`;

            await resend.emails.send({
                from: "gywns2zang9.dev <onboarding@resend.dev>",
                to: ["gywns2zang9@gmail.com"],
                subject: `새로운 의견이 등록되었습니다! (${boardName})`,
                html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p><strong>게시판:</strong> ${boardName}</p>
            <p><strong>작성자:</strong> ${is_anonymous ? "익명 (" + realName + ")" : realName}</p>
            <p><strong>내용:</strong><br/>${content.replace(/\n/g, "<br/>")}</p>
            <p style="font-size: 13px; color: #666; margin-top: 15px;">
              <a href="${redirectUrl}" style="color: #0070f3; text-decoration: none; font-weight: bold;">확인하러 가기 &rarr;</a>
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
