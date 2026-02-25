"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  NotebookPen,
  ChevronLeft,
  ChevronRight,
  X,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { maskName } from "@/lib/utils/mask-name";

type Entry = {
  id: number;
  content: string;
  display_name?: string | null;
  user_email: string | null;
  user_id: string | null;
  created_at: string;
  is_anonymous: boolean;
};

type ReactionType = "like" | "dislike";

type Props = {
  initialEntries: Entry[];
  userEmail: string | null;
  userId: string | null;
  userName: string | null;
  initialCount: number;
};

const PAGE_SIZE = 5;
const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID;

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
  const [reactingId, setReactingId] = useState<number | null>(null);
  const [reactionCounts, setReactionCounts] = useState<
    Record<number, { like: number; dislike: number }>
  >({});
  const [userReactions, setUserReactions] = useState<
    Record<number, ReactionType | null>
  >({});
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
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          is_anonymous: isAnonymous,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit");
      }

      const data = await res.json();
      if (data) {
        await loadPage(1);
        setContent("");
        setTotalCount((prev) => prev + 1);
        setIsAnonymous(false);
      }
    } catch (err) {
      console.error(err);
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

  const isLoggedIn = Boolean(user?.id);
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

  // Reactions: fetch counts and user reaction for visible entries
  useEffect(() => {
    const loadReactions = async () => {
      if (entries.length === 0) return;
      const entryIds = entries.map((e) => e.id);
      const { data, error } = await supabase
        .from("guestbook_reactions")
        .select("entry_id,type,user_id")
        .in("entry_id", entryIds);
      if (error || !data) return;

      const counts: Record<number, { like: number; dislike: number }> = {};
      const mine: Record<number, ReactionType | null> = {};

      entryIds.forEach((id) => {
        counts[id] = { like: 0, dislike: 0 };
        mine[id] = null;
      });

      data.forEach((row: { entry_id: number; type: ReactionType; user_id: string }) => {
        if (!counts[row.entry_id]) {
          counts[row.entry_id] = { like: 0, dislike: 0 };
        }
        counts[row.entry_id][row.type] += 1;
        if (row.user_id === user?.id) {
          mine[row.entry_id] = row.type;
        }
      });

      setReactionCounts(counts);
      setUserReactions(mine);
    };

    loadReactions();
  }, [entries, supabase, user?.id]);

  const toggleReaction = async (entryId: number, type: ReactionType) => {
    if (!user?.id) return;
    const current = userReactions[entryId];
    setReactingId(entryId);
    try {
      // If same reaction, remove
      if (current === type) {
        const { error } = await supabase
          .from("guestbook_reactions")
          .delete()
          .eq("entry_id", entryId)
          .eq("user_id", user.id);
        if (error) throw error;
        setUserReactions((prev) => ({ ...prev, [entryId]: null }));
        setReactionCounts((prev) => ({
          ...prev,
          [entryId]: {
            like:
              (prev[entryId]?.like ?? 0) -
              (type === "like" ? 1 : 0),
            dislike:
              (prev[entryId]?.dislike ?? 0) -
              (type === "dislike" ? 1 : 0),
          },
        }));
        return;
      }

      // Otherwise upsert new reaction (delete old then insert)
      await supabase
        .from("guestbook_reactions")
        .delete()
        .eq("entry_id", entryId)
        .eq("user_id", user.id);

      const { error } = await supabase
        .from("guestbook_reactions")
        .insert({
          entry_id: entryId,
          user_id: user.id,
          type,
        });
      if (error) throw error;

      setUserReactions((prev) => ({ ...prev, [entryId]: type }));
      setReactionCounts((prev) => ({
        ...prev,
        [entryId]: {
          like:
            (prev[entryId]?.like ?? 0) +
            (type === "like" ? 1 : 0) -
            (current === "like" ? 1 : 0),
          dislike:
            (prev[entryId]?.dislike ?? 0) +
            (type === "dislike" ? 1 : 0) -
            (current === "dislike" ? 1 : 0),
        },
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setReactingId(null);
    }
  };

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <NotebookPen size={18} />
          방명록
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder={
              isLoggedIn ? "의견을 남겨주세요!" : "로그인이 필요합니다."
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
            <p className="text-sm text-muted-foreground">방명록이 비었네요...</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border/60 bg-muted/40 p-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {(() => {
                        const realName = entry.display_name ??
                          entry.user_email ??
                          (entry.user_id ? "알 수 없음" : "익명");

                        // 관리자: 익명이면 "익명(실명)", 아니면 실명
                        if (isAdmin) {
                          return entry.is_anonymous ? `익명(${realName})` : realName;
                        }

                        // 일반 로그인: 익명이면 "익명", 아니면 실명
                        if (isLoggedIn) {
                          return entry.is_anonymous ? "익명" : realName;
                        }

                        // 비로그인: 익명이면 "익명", 아니면 마스킹
                        return entry.is_anonymous ? "익명" : maskName(realName);
                      })()}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </span>
                    {user?.id && (isAdmin || entry.user_id === user.id) ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="hover:bg-transparent text-muted-foreground hover:text-destructive p-0 h-4 w-4"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        aria-label="삭제"
                      >
                        <X size={14} className="text-current" />
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={`h-7 w-auto px-2 hover:bg-transparent ${userReactions[entry.id] === "like"
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                        }`}
                      onClick={() => toggleReaction(entry.id, "like")}
                      disabled={!isLoggedIn || reactingId === entry.id}
                    >
                      <ThumbsUp size={14} className="text-current" />
                      <span>{reactionCounts[entry.id]?.like ?? 0}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={`h-7 w-auto px-2 hover:bg-transparent ${userReactions[entry.id] === "dislike"
                        ? "text-destructive"
                        : "text-muted-foreground hover:text-destructive"
                        }`}
                      onClick={() => toggleReaction(entry.id, "dislike")}
                      disabled={!isLoggedIn || reactingId === entry.id}
                    >
                      <ThumbsDown size={14} className="text-current" />
                      <span>{reactionCounts[entry.id]?.dislike ?? 0}</span>
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-line text-sm text-foreground">
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

