import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { UserDropdown } from "./user-dropdown";

export async function AuthButton() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const displayName =
    (user?.user_metadata as { full_name?: string } | null)?.full_name ??
    user?.email?.split('@')[0] ??
    "사용자";

  return user ? (
    <UserDropdown displayName={displayName} email={user.email || ""} />
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/login">로그인</Link>
      </Button>
    </div>
  );
}
