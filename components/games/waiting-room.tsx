"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// 하트비트로 접속 상태를 갱신하고, 일정 시간(무응답) 지난 유저는 숨김
// 더 빠른 실시간 느낌을 위해 짧은 주기 사용
// 현재 사용자 수가 많지 않아 1초 하트비트/1초 갱신, 3초 스테일로 관대하게 반영
const STALE_MS = 3_000;
const HEARTBEAT_MS = 1_000;

type WaitingUser = {
  id: string;
  user_id?: string | null;
  nickname?: string | null;
  display_name?: string | null;
  created_at?: string | null;
  game_id?: string | null;
};

type Challenge = {
  id: string;
  game_id: string;
  from_user: string;
  from_display_name?: string | null;
  to_user: string;
  to_display_name?: string | null;
  status: "pending" | "accepted" | "declined";
  created_at?: string | null;
};

type Props = {
  gameId: string;
  currentUserId?: string | null;
  currentUserDisplayName?: string | null;
};

export function WaitingRoom({ gameId, currentUserId, currentUserDisplayName }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [users, setUsers] = useState<WaitingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionDisplayName, setSessionDisplayName] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initFromProps = () => {
      if (currentUserId) {
        setSessionUserId(currentUserId);
        setSessionDisplayName(currentUserDisplayName ?? null);
        return true;
      }
      return false;
    };

    const getSessionUser = async () => {
      const { data } = await supabase.auth.getUser();
      setSessionUserId(data.user?.id ?? null);
      const display =
        (data.user?.user_metadata as { full_name?: string; display_name?: string } | null)
          ?.display_name ||
        (data.user?.user_metadata as { full_name?: string } | null)?.full_name ||
        data.user?.email ||
        null;
      setSessionDisplayName(display);
    };

    if (!initFromProps()) {
      getSessionUser();
    }

    const fetchInitial = async () => {
      setLoading(true);
      setError(null);
      const cutoff = new Date(Date.now() - STALE_MS).toISOString();
      const { data, error } = await supabase
        .from("game_waiting")
        .select("*")
        .eq("game_id", gameId)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: true });
      if (error) {
        setError("대기열을 불러올 수 없습니다.");
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };

    fetchInitial();

    const channel = supabase
      .channel(`waiting:${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_waiting", filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setUsers((prev) => [...prev, payload.new as WaitingUser]);
          } else if (payload.eventType === "DELETE") {
            setUsers((prev) => prev.filter((u) => u.id !== (payload.old as WaitingUser).id));
          } else if (payload.eventType === "UPDATE") {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === (payload.new as WaitingUser).id ? (payload.new as WaitingUser) : u,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase, currentUserId, currentUserDisplayName]);

  // 대결 요청 fetch & subscribe
  useEffect(() => {
    if (!sessionUserId) return;

    const fetchChallenges = async () => {
      setChallengeError(null);
      const { data, error } = await supabase
        .from("game_challenges")
        .select("*")
        .eq("game_id", gameId)
        .or(`to_user.eq.${sessionUserId},from_user.eq.${sessionUserId}`)
        .order("created_at", { ascending: false });
      if (error) {
        setChallengeError("대결 요청을 불러올 수 없습니다.");
        console.error("fetch challenges error", error);
      } else {
        setChallenges((data ?? []) as Challenge[]);
      }
    };

    fetchChallenges();

    const channel = supabase
      .channel(`challenges:${gameId}:${sessionUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_challenges",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const row = payload.new as Challenge;
          if (
            row.to_user !== sessionUserId &&
            row.from_user !== sessionUserId
          ) {
            return;
          }
          if (payload.eventType === "INSERT") {
            setChallenges((prev) => [row, ...prev.filter((c) => c.id !== row.id)]);
          } else if (payload.eventType === "UPDATE") {
            setChallenges((prev) =>
              prev.map((c) => (c.id === row.id ? row : c)),
            );
          } else if (payload.eventType === "DELETE") {
            setChallenges((prev) => prev.filter((c) => c.id !== (payload.old as Challenge).id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, sessionUserId, supabase]);

  useEffect(() => {
    // 본인 자동 등록(없을 때) + 하트비트로 존재 여부 갱신
    if (!sessionUserId) return;
    const upsertSelf = async (silent = false) => {
      const payload = {
        user_id: sessionUserId,
        display_name: sessionDisplayName,
        game_id: gameId,
        created_at: new Date().toISOString(), // act as last_seen
      };
      const { error: upsertError } = await supabase.from("game_waiting").upsert(payload, {
        onConflict: "user_id,game_id",
      });
      if (upsertError) {
        if (!silent) setError("대기열 등록에 실패했습니다.");
        console.error("game_waiting upsert error", upsertError);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("game_waiting")
        .select("*")
        .eq("user_id", sessionUserId)
        .eq("game_id", gameId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("game_waiting fetch self error", fetchError);
        return;
      }

      if (data) {
        setUsers((prev) => {
          const exists = prev.some((u) => u.id === data.id);
          return exists ? prev : [...prev, data as WaitingUser];
        });
      }
    };

    upsertSelf();

    const heartbeat = setInterval(() => {
      upsertSelf(true);
    }, HEARTBEAT_MS);

    return () => {
      clearInterval(heartbeat);
      supabase.from("game_waiting").delete().eq("user_id", sessionUserId).eq("game_id", gameId);
    };
  }, [gameId, sessionUserId, sessionDisplayName, supabase]);

  const renderUsers = useMemo(() => {
    const cutoff = new Date(now - STALE_MS).toISOString();
    const active = users.filter((u) => !u.created_at || u.created_at >= cutoff);
    const hasSelf =
      sessionUserId &&
      active.some((u) => u.user_id && sessionUserId && u.user_id === sessionUserId);
    if (sessionUserId && !hasSelf) {
      return [
        ...active,
        {
          id: "self",
          user_id: sessionUserId,
          display_name: sessionDisplayName ?? "나",
          created_at: new Date().toISOString(),
          game_id: gameId,
        },
      ];
    }
    return active;
  }, [users, sessionUserId, sessionDisplayName, gameId, now]);

  const handleChallenge = async (target: WaitingUser) => {
    if (!sessionUserId || !target.user_id || target.user_id === sessionUserId) return;
    setChallengeLoading(true);
    setChallengeError(null);
    const { error } = await supabase.from("game_challenges").insert({
      game_id: gameId,
      from_user: sessionUserId,
      from_display_name: sessionDisplayName || "익명 유저",
      to_user: target.user_id,
      to_display_name: target.display_name || "익명 유저",
      status: "pending",
    });
    if (error) {
      setChallengeError("대결 신청에 실패했습니다.");
      console.error("challenge insert error", error);
    }
    setChallengeLoading(false);
  };

  const handleRespond = async (challengeId: string, status: "accepted" | "declined") => {
    setChallengeLoading(true);
    setChallengeError(null);
    const { error } = await supabase
      .from("game_challenges")
      .update({ status })
      .eq("id", challengeId);
    if (error) {
      setChallengeError("응답에 실패했습니다.");
      console.error("challenge update error", error);
    }
    setChallengeLoading(false);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm text-sm text-muted-foreground">
        대기열을 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm text-sm text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
      <p className="text-sm font-semibold mb-2">대기열</p>
      <div className="flex flex-col divide-y divide-border/60">
        {renderUsers.map((user) => {
          const isSelf = sessionUserId && user.user_id === sessionUserId;
          return (
            <div
              key={user.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {(user.display_name || "익명 유저") + (isSelf ? " (나)" : "")}
                </span>
              </div>
              {isSelf ? null : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleChallenge(user)}
                  disabled={challengeLoading || !user.user_id}
                >
                  대결 신청
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold">대결 요청</p>
        {challengeError ? (
          <p className="text-sm text-red-500">{challengeError}</p>
        ) : null}
        {challenges.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 요청이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {challenges.map((c) => {
              const isIncoming = c.to_user === sessionUserId;
              const label = isIncoming
                ? `${c.from_display_name ?? "익명"} -> 나`
                : `나 -> ${c.to_display_name ?? "익명"}`;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-3 py-2"
                >
                  <div className="text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {c.status}
                    </span>
                  </div>
                  {isIncoming && c.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespond(c.id, "accepted")}
                        disabled={challengeLoading}
                      >
                        수락
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRespond(c.id, "declined")}
                        disabled={challengeLoading}
                      >
                        거절
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

