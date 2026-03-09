import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/";

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.user) {
            const user = data.user;

            // 신규 가입 여부 체크 (created_at과 last_sign_in_at이 거의 동일하거나 최초 로그인인 경우)
            // 혹은 user_metadata에 가입 기록을 남기는 대신 여기서는 가입 직후임을 알리기 위해 created_at을 체크합니다.
            const createdAt = new Date(user.created_at).getTime();
            const now = Date.now();
            const isNewUser = (now - createdAt) < 30 * 1000; // 가입 후 30초 이내인 경우 신규 유저로 간주

            if (isNewUser) {
                try {
                    const { Resend } = await import("resend");
                    const resend = new Resend(process.env.RESEND_API_KEY);
                    const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "알 수 없음";
                    const provider = user.app_metadata?.provider ?? "알 수 없음";

                    await resend.emails.send({
                        from: "gywns2zang9.dev <onboarding@resend.dev>",
                        to: ["gywns2zang9@gmail.com"],
                        subject: `🎉 새로운 유저가 가입했습니다! (${provider})`,
                        html: `
                            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                                <h2><strong>${displayName}</strong> 가입 알림</h2>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                                <p style="font-size: 11px; color: #999;">본 메일은 gywns2zang9.dev에서 발송된 메일입니다.</p>
                            </div>
                        `,
                    });
                    console.log("[Auth Callback] Signup notification sent.");
                } catch (emailError) {
                    console.error("[Auth Callback] Email notification failed:", emailError);
                }
            }

            const forwardedHost = request.headers.get("x-forwarded-host");
            const isLocalEnv = process.env.NODE_ENV === "development";
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
