"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Trophy } from "lucide-react";
import { isValidKoreanWord } from "@/lib/korean-words";

// ─── 초성 목록 ───────────────────────────────────────────────
const CHOSUNGS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

const CHOSUNGS_ALL = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
];

// ─── 기본 게임 설정 ──────────────────────────────────────────
export interface GameConfig {
    gameDuration: number;   // 라운드 제한 시간(초)
    breakDuration: number;  // 라운드 간 휴식(ms)
    numConsonants: number;  // 초성 개수
}

const DEFAULT_CONFIG: GameConfig = {
    gameDuration: 10,
    breakDuration: 3000,
    numConsonants: 2,
};

// ─── 랭킹 ────────────────────────────────────────────────────
interface RankEntry {
    user_name: string;
    score: number;
    created_at: string;
}

// ─── 임팩트 텍스트 ───────────────────────────────────────────
interface ImpactWord {
    id: number;
    text: string;
    type: "correct" | "wrong" | "duplicate" | "notword";
    x: number;
}

type GamePhase = "idle" | "playing" | "break" | "checking" | "gameover";

// ─── 초성 추출 ───────────────────────────────────────────────
function getChosung(char: string): string {
    const code = char.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return char;
    const idx = Math.floor(code / (21 * 28));
    return CHOSUNGS_ALL[idx];
}

function wordMatchesChosung(word: string, chosungs: string[]): boolean {
    if (word.length !== chosungs.length) return false;
    return word.split("").every((char, i) => getChosung(char) === chosungs[i]);
}

function randomChosung() {
    return CHOSUNGS[Math.floor(Math.random() * CHOSUNGS.length)];
}

function generatePair(n: number): string[] {
    return Array.from({ length: n }, () => randomChosung());
}

// ─── 확장 가능 텍스트 컴포넌트 ───
function ExpandableText({ text, maxLength = 80 }: { text: string; maxLength?: number }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldShowButton = text.length > maxLength;

    const displayText = isExpanded ? text : text.slice(0, maxLength) + (shouldShowButton ? "..." : "");

    return (
        <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {displayText}
            </p>
            {shouldShowButton && (
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[10px] font-bold text-primary hover:underline w-fit"
                >
                    {isExpanded ? "접기 ▲" : "더보기 ▼"}
                </button>
            )}
        </div>
    );
}

// ─── Props ───────────────────────────────────────────────────
interface ChosungGameProps {
    userName: string;
    gameConfig?: Partial<GameConfig>;
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────
export function ChosungGame({ userName, gameConfig }: ChosungGameProps) {
    const cfg: GameConfig = { ...DEFAULT_CONFIG, ...gameConfig };

    const [phase, setPhase] = useState<GamePhase>("idle");
    const [currentChosung, setCurrentChosung] = useState<string[]>(
        Array(cfg.numConsonants).fill("?")
    );
    const [timeLeft, setTimeLeft] = useState(cfg.gameDuration);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(1);
    const [input, setInput] = useState("");
    const [impactWords, setImpactWords] = useState<ImpactWord[]>([]);
    const [ranking, setRanking] = useState<RankEntry[]>([]);
    const [finalScore, setFinalScore] = useState(0);
    const [roundScore, setRoundScore] = useState(0);
    const [shake, setShake] = useState(false);
    const [chosungPulse, setChosungPulse] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [wordMeta, setWordMeta] = useState<{ word: string; realWord?: string; pos?: string; description: string; link?: string } | null>(null);
    const [sessionWords, setSessionWords] = useState<{ word: string; realWord?: string; pos?: string; type: ImpactWord["type"]; description?: string; link?: string }[]>([]);
    const [isValidating, setIsValidating] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const impactIdRef = useRef(0);
    const roundScoredRef = useRef(false);
    const currentScoreRef = useRef(0);
    const usedWordsRef = useRef<Set<string>>(new Set());
    const breakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const roundCountRef = useRef(0); // 완료된 라운드 수 (난이도 계산용)

    const loadRanking = useCallback(async () => {
        try {
            const res = await fetch("/api/chosung-scores");
            if (res.ok) setRanking(await res.json());
        } catch { }
    }, []);

    useEffect(() => { loadRanking(); }, [loadRanking]);

    useEffect(() => {
        if (phase === "playing") {
            const timer = setTimeout(() => inputRef.current?.focus(), 10);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    // 검증 완료 후 자동으로 포커스 다시 잡기
    useEffect(() => {
        if (!isValidating && phase === "playing") {
            inputRef.current?.focus();
        }
    }, [isValidating, phase]);

    const endGame = useCallback(async (latestScore?: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (breakTimeoutRef.current) clearTimeout(breakTimeoutRef.current);

        const scoreToSave = latestScore ?? currentScoreRef.current;
        setFinalScore(scoreToSave);
        setPhase("gameover");
        setLives(0);

        try {
            if (userName !== "비회원") {
                await fetch("/api/chosung-scores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ score: scoreToSave }),
                });
                loadRanking();
            }
        } catch { }
    }, [loadRanking, userName]);

    const startRound = useCallback((pair?: string[]) => {
        const newPair = pair ?? generatePair(cfg.numConsonants);
        setCurrentChosung(newPair);
        // 라운드마다 0.1초 감소, 최소 1초 보장
        const roundDuration = Math.max(1, Number((cfg.gameDuration - roundCountRef.current * 0.1).toFixed(2)));
        setTimeLeft(roundDuration);
        setInput("");
        setRoundScore(0);
        setFeedback(null);
        setWordMeta(null);
        roundScoredRef.current = false;
        setPhase("playing");
        setChosungPulse(true);
        setTimeout(() => setChosungPulse(false), 600);
        inputRef.current?.focus();
    }, [cfg.gameDuration, cfg.numConsonants]);

    useEffect(() => {
        if (phase === "playing") {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 0) {
                        clearInterval(timerRef.current!);
                        setPhase("checking");
                        return 0;
                    }
                    return Number((prev - 0.01).toFixed(2));
                });
            }, 10);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase]);

    useEffect(() => {
        if (phase === "checking") {
            // 현재 단어 검증 중이라면 검증이 끝날 때까지 대기
            if (isValidating) return;

            if (roundScore === 0) {
                setFeedback("💔 정답을 맞추지 못했습니다!");
                setShake(true);
                setTimeout(() => {
                    setShake(false);
                    endGame(currentScoreRef.current);
                }, 600);
            } else {
                // 라운드 성공 → 다음 라운드 (카운드는 handleSubmit에서 이미 증가됨)
                setPhase("break");
                breakTimeoutRef.current = setTimeout(() => startRound(), cfg.breakDuration);
            }
        }
    }, [phase, roundScore, startRound, cfg.breakDuration, endGame, isValidating]);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (phase !== "playing" || !input.trim() || isValidating) return;

            const word = input.trim();
            setInput("");

            const matchesChosung = wordMatchesChosung(word, currentChosung);
            if (!matchesChosung) {
                addImpact(word, "wrong");
                setFeedback("❌ 초성이 일치하지 않습니다!");
                setShake(true);
                setSessionWords((prev) => [{ word, type: "wrong", description: "초성이 일치하지 않습니다." }, ...prev]);
                setTimeout(() => { setShake(false); setFeedback(null); }, 600);
                return;
            }

            if (usedWordsRef.current.has(word)) {
                addImpact(word, "duplicate");
                setFeedback("🔁 이미 입력한 단어입니다!");
                setShake(true);
                setSessionWords((prev) => [{ word, type: "duplicate", description: "이미 입력한 단어입니다." }, ...prev]);
                setTimeout(() => { setShake(false); setFeedback(null); }, 600);
                return;
            }

            setIsValidating(true);
            setFeedback("🔍 정답을 확인 중입니다...");

            const res = await isValidKoreanWord(word);

            setIsValidating(false);

            if (res?.valid) {
                usedWordsRef.current.add(word);
                setScore((prev) => {
                    const next = prev + 1;
                    currentScoreRef.current = next;
                    return next;
                });
                setRoundScore(1);
                roundScoredRef.current = true;
                addImpact(word, "correct", true);

                const desc = res.description || "뜻 정보가 없습니다.";
                const realW = res.word || word;
                const posInfo = res.pos || "";
                const dictionaryLink = `https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=${encodeURIComponent(realW)}`;

                setWordMeta({ word, realWord: realW, pos: posInfo, description: desc, link: dictionaryLink });
                setSessionWords((prev) => [{ word, realWord: realW, pos: posInfo, description: desc, type: "correct", link: dictionaryLink }, ...prev]);

                // 라운드 성공 시 카운터 증가 후 다음 라운드
                roundCountRef.current += 1;
                setPhase("break");
                breakTimeoutRef.current = setTimeout(() => startRound(), cfg.breakDuration);
            } else {
                // 서버 재시도 결과 실패했거나, 진짜 없는 단어인 경우 모두 '사전에 없는 단어'로 일관되게 처리
                addImpact(word, "notword");
                setFeedback("📖 표준국어대사전에 등록되지 않은 단어입니다.");
                setShake(true);
                const dictionaryLink = `https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=${encodeURIComponent(word)}`;
                setSessionWords((prev) => [{
                    word,
                    type: "notword",
                    description: "표준국어대사전에 등록되지 않은 단어입니다.",
                    link: dictionaryLink
                }, ...prev]);
                setTimeout(() => { setShake(false); setFeedback(null); }, 1500);
            }
            inputRef.current?.focus();
        },
        [phase, input, currentChosung, endGame, isValidating, cfg.breakDuration, startRound]
    );

    const addImpact = (text: string, type: ImpactWord["type"], showPlusOne: boolean = false) => {
        const id = ++impactIdRef.current;
        const x = Math.random() * 60 + 10;
        const displayText = showPlusOne ? `+1 ${text}` : text;
        setImpactWords((prev) => [...prev, { id, text: displayText, type, x }]);
        setTimeout(() => {
            setImpactWords((prev) => prev.filter((w) => w.id !== id));
        }, 900);
    };

    const handleStart = () => {
        setScore(0);
        setLives(1);
        currentScoreRef.current = 0;
        roundCountRef.current = 0; // 라운드 카운터 초기화
        setFinalScore(0);
        setImpactWords([]);
        setFeedback(null);
        setWordMeta(null);
        setSessionWords([]);
        usedWordsRef.current = new Set();
        startRound();
        // 모바일 대응: 클릭 이벤트 핸들러 내에서 즉시 포커스를 주어 키보드를 유도함
        inputRef.current?.focus();
    };

    const timeLeftNum = Number(timeLeft);
    const timerColor = timeLeftNum <= 2 ? "text-red-500" : timeLeftNum <= 3 ? "text-orange-400" : "text-emerald-400";
    const timerBg = timeLeftNum <= 2 ? "from-red-500/20 to-red-500/5" : timeLeftNum <= 3 ? "from-orange-400/20 to-orange-400/5" : "from-emerald-400/20 to-emerald-400/5";
    // 현재 라운드의 실제 제한시간 기준으로 프로그레스 계산
    const currentRoundDuration = Math.max(1, Number((cfg.gameDuration - roundCountRef.current * 0.1).toFixed(2)));
    const progressPct = (timeLeftNum / currentRoundDuration) * 100;
    const progressColor = timeLeftNum <= 2 ? "#ef4444" : timeLeftNum <= 3 ? "#fb923c" : "#34d399";

    const impactColors: Record<ImpactWord["type"], string> = {
        correct: "text-emerald-400",
        wrong: "text-red-400",
        duplicate: "text-yellow-400",
        notword: "text-orange-400",
    };
    const impactPrefix: Record<ImpactWord["type"], string> = {
        correct: "", // prefix는 이제 addImpact에서 직접 처리함
        wrong: "✗ ",
        duplicate: "↩ ",
        notword: "",
    };
    const impactSuffix: Record<ImpactWord["type"], string> = {
        correct: "",
        wrong: "",
        duplicate: "",
        notword: "?",
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
            {/* ── 게임 영역 ── */}
            <div className="flex-1 min-w-0">
                <div
                    className={`relative rounded-2xl border border-border bg-card overflow-hidden transition-all ${shake ? "animate-shake" : ""}`}
                >
                    {/* 임팩트 단어 */}
                    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                        {impactWords.map((w) => (
                            <span
                                key={w.id}
                                className={`absolute text-xl md:text-2xl font-black animate-impact-word select-none ${impactColors[w.type]}`}
                                style={{ left: `${w.x}%`, top: "25%" }}
                            >
                                {impactPrefix[w.type]}{w.text}{impactSuffix[w.type]}
                            </span>
                        ))}
                    </div>

                    <div className="flex flex-col h-full p-4 md:p-6 gap-3 md:gap-5">
                        {/* 상단: 타이머 + 점수 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-4">
                                {/* 타이머 */}
                                <div className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-gradient-to-r ${timerBg} border border-border/50`}>
                                    <span className="text-[10px] md:text-xs text-muted-foreground font-medium">TIME</span>
                                    <span className={`inline-block w-[3.5rem] md:w-[4.5rem] text-center text-lg md:text-2xl font-black tabular-nums ${timerColor} transition-colors duration-300`}>
                                        {phase === "idle" ? cfg.gameDuration.toFixed(2) : timeLeft.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 border border-primary/20">
                                <span className="text-[10px] md:text-xs text-muted-foreground font-medium">SCORE</span>
                                <span className="text-lg md:text-2xl font-black text-primary tabular-nums">{score}</span>
                            </div>
                        </div>

                        {/* 타이머 바 */}
                        <div className="w-full h-1.5 md:h-2 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: (phase === "idle" || phase === "break") ? "100%" : `${progressPct}%`,
                                    backgroundColor: progressColor,
                                    transition: phase === "playing" ? "width 10ms linear" : "none"
                                }}
                            />
                        </div>

                        {/* 초성 박스 */}
                        <div className="flex gap-2 md:gap-4 justify-center my-1 md:my-2">
                            {(phase === "idle" ? Array(cfg.numConsonants).fill("?") : currentChosung).map((ch, i) => (
                                <div
                                    key={i}
                                    className={`w-16 h-16 md:w-28 md:h-28 rounded-xl md:rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${phase === "break"
                                        ? "bg-muted/30 border-muted-foreground/20 scale-95 opacity-50"
                                        : phase === "playing"
                                            ? `bg-background border-primary/30 shadow-lg shadow-primary/5 ${chosungPulse ? "scale-105 border-primary ring-4 ring-primary/10" : "scale-100"}`
                                            : "bg-muted/10 border-border"
                                        }`}
                                >
                                    <span className={`text-3xl md:text-6xl font-black tracking-tighter ${phase === "playing" ? "text-foreground" : "text-muted-foreground"}`}>
                                        {ch}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* 상태 정보 (브레이크/피드백) */}
                        <div className="flex flex-col items-center justify-center -my-1">
                            {phase === "break" && (() => {
                                const nextDuration = Math.max(1, Number((cfg.gameDuration - roundCountRef.current * 0.1).toFixed(2)));
                                return (
                                    <span className="inline-flex items-center gap-1.5 text-sm px-4 py-1 rounded-full bg-muted/50 animate-pulse">
                                        <span className="text-muted-foreground">다음 라운드 제한 시간은</span>
                                        <span className="text-orange-400 font-black tabular-nums">{nextDuration.toFixed(2)}초</span>
                                        <span className="text-muted-foreground">입니다!</span>
                                    </span>
                                );
                            })()}
                            {feedback && phase === "playing" && (
                                <span className={`inline-flex items-center gap-2 text-xs px-4 py-1 rounded-full bg-muted/60 text-foreground animate-pulse ${feedback.includes("❌") || feedback.includes("🔁") || feedback.includes("💔") ? "text-red-400" : ""}`}>
                                    {feedback}
                                </span>
                            )}
                        </div>

                        {/* 입력 영역 */}
                        <form onSubmit={handleSubmit}>
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => {
                                        if (phase === "playing") {
                                            setInput(e.target.value);
                                        }
                                    }}
                                    autoComplete="off"
                                    // phase !== "playing" 일 때도 readOnly를 풀어서 모바일 키보드가 내려가는 것을 방지
                                    // 실제 입력은 onChange에서 phase 조건으로 막음
                                    readOnly={isValidating}
                                    placeholder={
                                        phase === "idle"
                                            ? "게임을 시작하세요"
                                            : phase === "break"
                                                ? "잠시 대기..."
                                                : phase === "gameover"
                                                    ? "게임 종료"
                                                    : isValidating
                                                        ? "단어 검증 중..."
                                                        : `(${currentChosung.join("")}) 단어 입력`
                                    }
                                    className={`w-full px-5 py-4 pr-16 rounded-xl border text-base font-medium transition-all outline-none
                                    bg-background text-foreground placeholder:text-muted-foreground/50
                                    ${phase === "playing"
                                            ? "border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm shadow-primary/10"
                                            : "border-border opacity-70 cursor-default"
                                        }`}
                                />
                                <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 bg-muted/40">
                                    Enter
                                </kbd>
                            </div>

                            {/* 이번 라운드 점수 안내 삭제됨 */}
                        </form>

                        {/* 단어 뜻 표시 (국립국어원) */}
                        {wordMeta && phase === "playing" && !feedback && (
                            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 mt-2">
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                        <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded uppercase tracking-wider">stdict</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-foreground">{wordMeta.realWord || wordMeta.word}</p>
                                                {wordMeta.pos && (
                                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">{wordMeta.pos}</span>
                                                )}
                                            </div>
                                            {wordMeta.link && (
                                                <a
                                                    href={wordMeta.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-primary hover:underline font-medium shrink-0"
                                                >
                                                    🔍 표준국어대사전 검색
                                                </a>
                                            )}
                                        </div>
                                        <ExpandableText text={wordMeta.description} maxLength={120} />
                                        <p className="text-[9px] text-muted-foreground/50 mt-1 text-right italic">출처: 국립국어원 표준국어대사전</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 게임 컨트롤 */}
                        <div className="mt-2">
                            {phase === "gameover" && (
                                <div className="animate-in zoom-in duration-300">
                                    <button
                                        onClick={handleStart}
                                        className="block w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
                                    >
                                        다시 시작
                                    </button>
                                </div>
                            )}

                            {phase === "idle" && (
                                <button
                                    onClick={handleStart}
                                    className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
                                >
                                    게임 시작
                                </button>
                            )}

                            {(phase === "playing" || phase === "break") && (
                                <button
                                    onClick={() => endGame()}
                                    className="w-full py-3 rounded-xl border border-destructive/30 text-destructive font-bold text-sm hover:bg-destructive/10 active:scale-95 transition-all mt-2"
                                >
                                    게임 종료
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 사이드바: 랭킹 및 히스토리 ── */}
            {/* ── 사이드바: 랭킹 및 히스토리 ── */}
            <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
                {/* 단어 히스토리 (누적) - 모바일에서 위로 */}
                {sessionWords.length > 0 && (
                    <div className="order-1 lg:order-2 p-4 rounded-2xl border border-border bg-card/50">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Word History</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{sessionWords.length}</span>
                        </div>
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {sessionWords.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-xl border transition-all animate-in slide-in-from-left-2 duration-300
                                                ${item.type === "correct"
                                            ? "bg-emerald-500/5 border-emerald-500/10"
                                            : "bg-destructive/5 border-destructive/10"
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-sm font-bold ${item.type === "correct" ? "text-emerald-500" : "text-destructive"}`}>
                                                    {item.realWord || item.word}
                                                </span>
                                                {item.pos && <span className="text-[8px] text-muted-foreground opacity-70">({item.pos})</span>}
                                            </div>
                                        </div>
                                        {item.link && (
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-primary/70 hover:text-primary hover:underline shrink-0 ml-2 flex items-center gap-1"
                                                title="표준국어대사전 검색"
                                            >
                                                <Search className="w-3 h-3" /> 사전 검색
                                            </a>
                                        )}
                                    </div>
                                    {item.description && (
                                        <div className="mt-1 border-l-2 border-muted pl-2 py-0.5">
                                            <ExpandableText text={item.description} maxLength={80} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 랭킹 보드 - 모바일에서 아래로 */}
                <div className="order-2 lg:order-1 rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <h2 className="font-bold text-sm tracking-wide text-foreground uppercase">TOP 3</h2>
                    </div>

                    {ranking.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">
                            아직 기록이 없어요<br />
                        </p>
                    ) : (
                        <ol className="space-y-2">
                            {ranking.slice(0, 3).map((entry, i) => (
                                <li
                                    key={i}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${i === 0
                                        ? "bg-yellow-400/10 border border-yellow-400/25"
                                        : i === 1
                                            ? "bg-slate-400/10 border border-slate-400/20"
                                            : i === 2
                                                ? "bg-orange-400/10 border border-orange-400/20"
                                                : "bg-muted/30"
                                        }`}
                                >
                                    <span className="text-base shrink-0">
                                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{entry.user_name}</p>
                                    </div>
                                    <span className="text-sm font-black text-primary shrink-0">{entry.score}점</span>
                                </li>
                            ))}
                        </ol>
                    )}


                    {phase === "gameover" && (
                        <div className="pt-3 border-t border-border animate-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                                <span className="text-[10px] text-destructive font-bold uppercase tracking-tighter">Game Over</span>
                                <span className="text-xl font-black text-foreground">{finalScore}점</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* How to Play */}
            <div className="order-1 lg:order-2 p-4 rounded-2xl border border-border bg-card/50">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-amber-500">💡</span>
                    <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">How to Play</span>
                </div>
                <ul className="space-y-2.5 text-[11px] text-muted-foreground">
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">01</span>
                        <span><strong className="text-foreground">제한 시간</strong> 내에 제시된 <strong className="text-foreground">초성</strong>에 맞는 단어를 입력하세요</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">02</span>
                        <span>같은 단어는 <strong className="text-foreground">중복 입력 불가</strong>해요</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                        <span className="text-primary font-bold shrink-0 leading-none">03</span>
                        <span>라운드가 지날수록 제한 시간은 <strong className="text-foreground">0.1초씩</strong>줄어요</span>
                    </li>
                </ul>
            </div>

            {/* CSS */}
            <style jsx global>{`
                @keyframes impact-word {
                    0%   { opacity: 1; transform: translateY(0) scale(1.2); }
                    60%  { opacity: 1; transform: translateY(-40px) scale(1); }
                    100% { opacity: 0; transform: translateY(-70px) scale(0.85); }
                }
                .animate-impact-word { animation: impact-word 0.9s ease-out forwards; }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    15%       { transform: translateX(-8px); }
                    30%       { transform: translateX(8px); }
                    45%       { transform: translateX(-6px); }
                    60%       { transform: translateX(6px); }
                    75%       { transform: translateX(-4px); }
                    90%       { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.5s ease-in-out; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
}
