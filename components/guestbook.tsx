"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Flame, ChevronLeft, ChevronRight, Trash } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type Entry = {
  id: number;
  content: string;
  display_name?: string | null;
  user_email: string | null;
  user_id: string | null;
  created_at: string;
};

type Props = {
  initialEntries: Entry[];
  userEmail: string | null;
  userId: string | null;
  userName: string | null;
  initialCount: number;
};

const PAGE_SIZE = 5;
const ADMIN_UID = "9226f976-72f8-43b0-bb0d-76ef6de1f14e";

export function Guestbook({
  initialEntries,
  userEmail,
  userId,
  userName,
  initialCount,
}: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [user, setUser] = useState<{
    id: string | null;
    email: string | null;
    name: string | null;
  }>({ id: null, email: null, name: null });

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setUser({ id: userId, email: userEmail, name: userName });
  }, [userEmail, userId, userName]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const loadPage = async (targetPage: number) => {
    setLoadingPage(true);
    try {
      const offset = (targetPage - 1) * PAGE_SIZE;
      const { data, error, count } = await supabase
        .from("guestbook")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (data) setEntries(data as Entry[]);
      if (typeof count === "number") setTotalCount(count);
      setPage(targetPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPage(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (trimmed.length > 200) return;

    setSubmitting(true);
    try {
      const displayName = isAnonymous
        ? "익명"
        : user?.name ?? user?.email ?? "알 수 없음";
      const { data, error } = await supabase
        .from("guestbook")
        .insert({
          content: trimmed,
          user_email: user?.email ?? null,
          user_id: user?.id ?? null,
          display_name: displayName,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        // 새 글이 가장 앞에 오므로 첫 페이지로 재조회
        await loadPage(1);
        setContent("");
        setTotalCount((prev) => prev + 1);
        setIsAnonymous(false);
      }
    } catch (err) {
      console.error(err);
      // Optional: toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!user?.id) return;
    setDeletingId(entryId);
    try {
      const { error } = await supabase
        .from("guestbook")
        .delete()
        .eq("id", entryId)
        .eq("user_id", user.id);
      if (error) throw error;

      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      setTotalCount((prev) => Math.max(0, prev - 1));

      // If current page becomes empty and previous pages exist, 이동
      const newTotal = totalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      const targetPage = Math.min(page, newTotalPages);
      await loadPage(targetPage);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    // initial fetch not needed; initialEntries provided
    setEntries(initialEntries);
    setTotalCount(initialCount);
    setPage(1);
  }, [initialEntries, initialCount]);

  const isLoggedIn = Boolean(user?.email);
  const isAdmin = user?.id === ADMIN_UID;
  const maxLength = 200;
  const currentLength = content.length;
  const currentGroupStart = Math.floor((page - 1) / 5) * 5 + 1;
  const currentGroupEnd = Math.min(totalPages, currentGroupStart + 4);
  const groupPages = [];
  for (let p = currentGroupStart; p <= currentGroupEnd; p++) {
    groupPages.push(p);
  }
  const disableGroupPrev = currentGroupStart === 1 || loadingPage;
  const disableGroupNext = currentGroupEnd >= totalPages || loadingPage;
  const handlePageSelect = async (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) return;
    await loadPage(targetPage);
  };

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Flame size={18} />
          관심주기
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder={
              isLoggedIn ? "감사합니다" : "로그인이 필요합니다."
            }
            value={content}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setContent(e.target.value.slice(0, maxLength))
            }
            disabled={!isLoggedIn || submitting}
            className="min-h-[96px] whitespace-pre-wrap"
            maxLength={maxLength}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {isLoggedIn ? (
              <span>
                {currentLength}/{maxLength}
              </span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(val: boolean | "indeterminate") =>
                  setIsAnonymous(Boolean(val))
                }
              />
              <label htmlFor="anonymous" className="cursor-pointer">
                익명
              </label>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!isLoggedIn || submitting || !content.trim()}
              >
                등록
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 없어요...</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border/60 bg-muted/40 p-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {entry.display_name ??
                        entry.user_email ??
                        (entry.user_id ? "알 수 없음" : "익명")}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {user?.id && (isAdmin || entry.user_id === user.id) ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                      >
                        <Trash size={14} />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                  {entry.content}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageSelect(currentGroupStart - 5)}
              disabled={disableGroupPrev}
            >
              <ChevronLeft size={14} className="mr-1" />
              이전
            </Button>
            {groupPages.map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                disabled={loadingPage}
                onClick={() => handlePageSelect(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageSelect(currentGroupEnd + 1)}
              disabled={disableGroupNext}
            >
              다음
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

