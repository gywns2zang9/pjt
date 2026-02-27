"use client";

import { useState, useEffect } from "react";
import { format, subYears, subMonths, subDays, startOfToday } from "date-fns";
import {
    Search,
    Calendar,
    Loader2,
    RefreshCw,
    PieChart as PieChartIcon,
    ChevronRight,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

import { StockSearchResult } from "@/lib/stock/service";
import { SimulationResult, Summary, Simulator } from "@/lib/stock/simulator";

export function IfBuy() {
    // Form State
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
    const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
    const [startDate, setStartDate] = useState(format(subYears(startOfToday(), 1), "yyyy-MM-dd"));
    const [strategy, setStrategy] = useState<"LUMP" | "DCA">("LUMP");
    const [amount, setAmount] = useState<number | "">(1000000); // 100만원 OR 1주

    const [simulatedStock, setSimulatedStock] = useState<StockSearchResult | null>(null);
    const [simulatedStartDate, setSimulatedStartDate] = useState<string>("");

    useEffect(() => {
        setAmount(strategy === "LUMP" ? 1000000 : 1);
    }, [strategy]);

    // UI State
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [chartData, setChartData] = useState<SimulationResult[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Search Debounce
    useEffect(() => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setSearchResults(data);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const formatKoreanAmount = (num: number) => {
        if (!num) return "";
        const units = ["", "만", "억"];
        let result = "";
        let temp = Math.min(num, 999999999999); // 9999억 9999만... 까지만
        let unitIdx = 0;

        while (temp > 0 && unitIdx < units.length) {
            const part = temp % 10000;
            if (part > 0) {
                const partStr = part.toLocaleString();
                result = `${partStr}${units[unitIdx]} ${result}`;
            }
            temp = Math.floor(temp / 10000);
            unitIdx++;
        }
        return result.trim() + "원";
    };

    const handleSimulate = async () => {
        if (!selectedStock) {
            setError("종목을 선택해주세요.");
            return;
        }

        if (amount === "" || amount <= 0) {
            setError("원금을 입력해주세요.");
            return;
        }

        if (amount >= 999999999999) {
            setError("그 돈 없잖아");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const today = format(startOfToday(), "yyyy-MM-dd");
            if (startDate === today) {
                setError("정확한 분석을 위해 날짜를 수정해주세요.");
                setIsLoading(false);
                return;
            }
            const res = await fetch(
                `/api/stock/history?symbol=${selectedStock.symbol}&start=${startDate}&end=${today}`
            );
            const history = await res.json();

            if (history.error) {
                throw new Error(history.error === "Symbol, start, and end dates are required" ? "필수 입력값이 누락되었습니다." : "데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            }

            if (!history || !Array.isArray(history) || history.length === 0) {
                throw new Error("데이터를 불러오지 못했습니다. 날짜를 확인해주세요.");
            }

            const results = strategy === "LUMP"
                ? Simulator.simulateLumpSum(history, Number(amount))
                : Simulator.simulateDCA(history, Number(amount), startDate);

            if (results.summary.totalShares === 0) {
                if (strategy === "DCA") {
                    setError("기준일을 최소 1달 전으로 설정해주세요.");
                } else {
                    const firstPrice = history[0].open;
                    setError(`금액이 부족합니다. (최소 ${firstPrice.toLocaleString()}원 이상이어야 합니다.)`);
                }
                setIsLoading(false);
                return;
            }

            setChartData(results.chartData);
            setSummary(results.summary);
            setSimulatedStock(selectedStock);
            setSimulatedStartDate(startDate);
            setShowResults(true);
        } catch (err: any) {
            setError(err.message || "시뮬레이션 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Input Settings */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <div className="space-y-4">
                            {/* Stock Search */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-xs font-medium text-muted-foreground">종목 선택</label>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Search className="w-3.5 h-3.5 text-muted-foreground" />}
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm"
                                        placeholder="삼성전자"
                                        value={selectedStock ? selectedStock.name : query}
                                        onFocus={() => {
                                            if (selectedStock) {
                                                setQuery(selectedStock.name);
                                                setSelectedStock(null);
                                            }
                                        }}
                                        onChange={(e) => {
                                            setQuery(e.target.value);
                                            if (selectedStock) setSelectedStock(null);
                                        }}
                                    />

                                    {searchResults.length > 0 && !selectedStock && (
                                        <div className="absolute z-50 left-0 right-0 mt-1.5 p-1 rounded-xl bg-popover border border-border shadow-lg max-h-48 overflow-y-auto">
                                            {searchResults.map((stock) => (
                                                <button
                                                    key={stock.symbol}
                                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                                                    onClick={() => {
                                                        setSelectedStock(stock);
                                                        setSearchResults([]);
                                                        setQuery("");
                                                    }}
                                                >
                                                    <div>
                                                        <p className="text-sm font-semibold">{stock.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{stock.symbol} · {stock.exchange}</p>
                                                    </div>
                                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Strategy */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground ml-1">투자 방법</label>
                                <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/50 border border-border">
                                    <button
                                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${strategy === "LUMP" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                        onClick={() => setStrategy("LUMP")}
                                    >
                                        거치식
                                    </button>
                                    <button
                                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${strategy === "DCA" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                        onClick={() => setStrategy("DCA")}
                                    >
                                        적립식
                                    </button>
                                </div>
                            </div>

                            {/* Date & Amount */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center justify-between ml-1 gap-2 mb-1">
                                        <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">기준일</label>
                                        <div className="flex flex-wrap gap-1">
                                            {strategy !== "DCA" && (
                                                <button
                                                    onClick={() => setStartDate(format(subDays(startOfToday(), 1), "yyyy-MM-dd"))}
                                                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                                >
                                                    어제
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setStartDate(format(subMonths(startOfToday(), 1), "yyyy-MM-dd"))}
                                                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                            >
                                                1달 전
                                            </button>
                                            <button
                                                onClick={() => setStartDate(format(subYears(startOfToday(), 1), "yyyy-MM-dd"))}
                                                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                            >
                                                1년 전
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground transition-colors" />
                                        </div>
                                        <input
                                            type="date"
                                            max={format(subDays(startOfToday(), 1), "yyyy-MM-dd")}
                                            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">
                                        {strategy === "DCA" ? "수량 (매월 1일 기준)" : "원금 (원)"}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold leading-none">
                                            {strategy === "DCA" ? "주" : "₩"}
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                                            value={amount === "" ? "" : amount.toLocaleString()}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, "");
                                                if (val === "") {
                                                    setAmount("");
                                                    return;
                                                }
                                                const num = parseInt(val, 10);
                                                if (!isNaN(num)) {
                                                    setAmount(Math.min(num, 999999999999));
                                                }
                                            }}
                                            placeholder={strategy === "DCA" ? "기본값: 1주" : "금액 입력"}
                                        />
                                    </div>
                                    {strategy === "DCA" && (
                                        <p className="text-[10px] text-muted-foreground font-medium ml-1">
                                            ※ 매월 1일(또는 다음 영업일)기준
                                        </p>
                                    )}
                                    {strategy === "LUMP" && amount !== "" && amount > 0 && (
                                        <p className="text-[10px] text-primary font-medium ml-1 animate-in fade-in slide-in-from-top-1">
                                            {formatKoreanAmount(amount)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        {error && <p className="text-destructive text-xs text-center font-medium my-2 bg-destructive/10 py-2 rounded-lg">{error}</p>}

                        <button
                            disabled={isLoading}
                            onClick={handleSimulate}
                            className="w-full py-4 mt-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "결과 조회하기"}
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                <div className="lg:col-span-8 flex flex-col gap-6 relative min-h-[400px]">
                    {isLoading && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl animate-in fade-in duration-200">
                            <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
                            <div className="text-center">
                                <p className="font-bold text-lg">불러오는 중...</p>
                                <p className="text-sm text-muted-foreground mt-1">잠시만 기다려주세요</p>
                            </div>
                        </div>
                    )}

                    {!showResults && !isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border bg-card/50">
                            <RefreshCw className="w-10 h-10 text-muted-foreground/20 animate-pulse mb-4" />
                            <p className="text-muted-foreground text-sm text-center">조건을 입력하고 결과를 확인해보세요.</p>
                        </div>
                    ) : (
                        showResults && (
                            <div className="space-y-6 animate-in fade-in duration-500">

                                {/* Details */}
                                <div className="p-5 rounded-2xl border border-border bg-card">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight">
                                                보유 수량
                                            </p>
                                            <p className="font-black text-sm">{summary?.totalShares.toLocaleString()} 주</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight">
                                                평균 매수 단가
                                            </p>
                                            <p className="font-black text-sm">{Math.round(summary?.averagePrice || 0).toLocaleString()}원</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight">
                                                투자 원금
                                            </p>
                                            <p className="font-black text-sm">{summary?.totalInvested.toLocaleString()}원</p>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight">
                                                    평가 금액
                                                </p>
                                                {summary && summary.totalInvested > 0 && (() => {
                                                    const rate = ((summary.finalValue - summary.totalInvested) / summary.totalInvested) * 100;
                                                    const isPositive = rate > 0;
                                                    const isNegative = rate < 0;
                                                    const colorClass = isPositive ? "text-destructive" : isNegative ? "text-blue-500" : "text-muted-foreground";
                                                    const sign = isPositive ? "+" : "";
                                                    return (
                                                        <span className={`text-[10px] font-bold ${colorClass}`}>
                                                            ({sign}{rate.toFixed(2)}%)
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <p className="font-black text-sm">{summary?.finalValue.toLocaleString()}원</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 gap-4">
                                        <div className="w-full sm:w-auto">
                                            <h3 className="text-base font-bold flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                <span className="break-all">{simulatedStock?.name}</span>
                                                <span className="text-muted-foreground text-xs font-normal">({simulatedStock?.symbol})</span>
                                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-semibold whitespace-nowrap">{simulatedStock?.exchange}</span>
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{simulatedStartDate} ~ 현재</p>
                                        </div>
                                        <div className="text-right flex flex-wrap items-end justify-start sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                                            {(() => {
                                                const maxHigh = chartData.length > 0 ? Math.max(...chartData.map(d => d.high || d.price)) : 0;
                                                const minLow = chartData.length > 0 ? Math.min(...chartData.map(d => d.low || d.price)) : 0;
                                                return (
                                                    <div className="flex gap-3 mr-2">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">최저가</p>
                                                            <p className="text-sm font-semibold text-blue-500">{minLow.toLocaleString()}원</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mb-0.5">최고가</p>
                                                            <p className="text-sm font-semibold text-destructive">{maxHigh.toLocaleString()}원</p>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            <div className="text-right pl-2 border-l border-border/50">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">현재가</p>
                                                <p className="text-xl font-black text-emerald-500">
                                                    {chartData.length > 0 ? chartData[chartData.length - 1].price.toLocaleString() : "-"}원
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-[300px] w-full mt-4 relative overflow-hidden min-w-0">
                                        <style jsx global>{`
                                            @keyframes chartReveal {
                                                from { clip-path: inset(0 100% 0 0); }
                                                to { clip-path: inset(0 0 0 0); }
                                            }
                                            .animate-chart-reveal {
                                                animation: chartReveal 2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                                                min-width: 0;
                                            }
                                        `}</style>
                                        <ResponsiveContainer width="100%" height="100%" className="animate-chart-reveal">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={chartData.length > 0 && chartData[chartData.length - 1].price >= chartData[0].price ? "hsl(var(--destructive))" : "rgb(59 130 246)"} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={chartData.length > 0 && chartData[chartData.length - 1].price >= chartData[0].price ? "hsl(var(--destructive))" : "rgb(59 130 246)"} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                                <XAxis
                                                    dataKey="date"
                                                    hide
                                                />
                                                <YAxis
                                                    hide
                                                    domain={['dataMin', 'dataMax']}
                                                />
                                                <Tooltip
                                                    content={({ active, payload }: any) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="p-3 rounded-xl bg-popover border border-border shadow-xl backdrop-blur-md">
                                                                    <p className="text-[10px] font-bold text-muted-foreground mb-1">{payload[0].payload.date}</p>
                                                                    <div className="space-y-1">
                                                                        <p className="text-xs font-black tracking-tight">
                                                                            <span className={
                                                                                payload[0].payload.price > chartData[0].price
                                                                                    ? "text-destructive" // 빨간색 (기준일보다 높음)
                                                                                    : payload[0].payload.price < chartData[0].price
                                                                                        ? "text-blue-500" // 파란색 (기준일보다 낮음)
                                                                                        : "text-foreground" // 동일
                                                                            }>{payload[0].payload.price.toLocaleString()}</span>원
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="price"
                                                    stroke={chartData.length > 0 && chartData[chartData.length - 1].price >= chartData[0].price ? "hsl(var(--destructive))" : "rgb(59 130 246)"}
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorValue)"
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
