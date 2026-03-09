"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKakaoLogin = async () => {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">뚝딱실</CardTitle>
          <CardDescription>
            걱정마세요. 닉네임과 이메일 정보만 털어가요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Button
              onClick={handleKakaoLogin}
              disabled={isLoading}
              className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] font-semibold"
              size="lg"
            >
              {isLoading ? (
                "로그인 중..."
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 3C6.477 3 2 6.58 2 11.02c0 2.64 1.75 4.96 4.4 6.35-.14.53-.9 3.35-.93 3.57 0 0-.02.17.09.24.11.07.24.02.24.02.32-.05 3.72-2.45 4.31-2.86.6.09 1.21.14 1.84.14 5.523 0 10-3.58 10-8.02C22 6.58 17.523 3 12 3Z" />
                  </svg>
                  카카오 로그인
                </div>
              )}
            </Button>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
