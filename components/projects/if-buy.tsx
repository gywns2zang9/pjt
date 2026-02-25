"use client";

import { useState, useEffect } from "react";
import { format, subYears, startOfToday } from "date-fns";
import {
    Search,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Loader2,
    RefreshCw,
    PieChart as PieChartIcon,
    ChevronRight,
    Calculator,
    Info
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
    const [amount, setAmount] = useState<number | "">(1000000); // 100만원
    const [strategy, setStrategy] = useState<"LUMP" | "DCA">("LUMP");
    const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
    const [dayOfValue, setDayOfValue] = useState(1);

    // Initial simulation once on mount (Disabled for now)
    useEffect(() => {
        // handleSimulate();
    }, []);

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
            setError("투자금을 입력해주세요.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const today = format(startOfToday(), "yyyy-MM-dd");
            const res = await fetch(
                `/api/stock/history?symbol=${selectedStock.symbol}&start=${startDate}&end=${today}`
            );
            const history = await res.json();

            if (!history || history.length === 0) {
                throw new Error("데이터를 불러오지 못했습니다. 날짜를 확인해주세요.");
            }

            const results = strategy === "LUMP"
                ? Simulator.simulateLumpSum(history, Number(amount))
                : Simulator.simulateDCA(history, Number(amount), frequency, dayOfValue);

            setChartData(results.chartData);
            setSummary(results.summary);
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
                                    <label className="text-xs font-medium text-muted-foreground">종목 검색</label>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Search className="w-3.5 h-3.5 text-muted-foreground" />}
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm"
                                        placeholder="종목 입력 (예: 삼성전자)"
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
                                <label className="text-xs font-medium text-muted-foreground ml-1">투자 기법</label>
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
                                    <label className="text-xs font-medium text-muted-foreground ml-1">시작일</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="date"
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-sm"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">투자금 (원)</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold leading-none">₩</div>
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
                                            placeholder="금액 입력"
                                        />
                                    </div>
                                    {amount !== "" && amount > 0 && (
                                        <p className="text-[10px] text-primary font-medium ml-1 animate-in fade-in slide-in-from-top-1">
                                            {formatKoreanAmount(amount)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* DCA Options */}
                        {strategy === "DCA" && (
                            <div className="space-y-3 pt-4 animate-in fade-in slide-in-from-top-2 border-t border-border mt-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">매수 주기</label>
                                    <select
                                        className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border focus:border-primary/50 outline-none text-xs appearance-none"
                                        value={frequency}
                                        onChange={(e: any) => setFrequency(e.target.value)}
                                    >
                                        <option value="daily">매일</option>
                                        <option value="weekly">매주 (첫 거래일)</option>
                                        <option value="monthly">매월</option>
                                    </select>
                                </div>
                                {frequency === "monthly" && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">구매일</label>
                                            <span className="text-xs font-bold text-primary">매월 {dayOfValue}일</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="28"
                                            className="w-full accent-primary h-1 bg-muted rounded-full appearance-none"
                                            value={dayOfValue}
                                            onChange={(e) => setDayOfValue(Number(e.target.value))}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            disabled={isLoading || !selectedStock}
                            onClick={handleSimulate}
                            className="w-full py-4 mt-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "결과 확인하기"}
                        </button>

                        {error && <p className="text-destructive text-xs text-center font-medium mt-2">{error}</p>}
                    </div>
                </div>

                {/* Results Section */}
                <div className="lg:col-span-8 flex flex-col gap-6 relative min-h-[400px]">
                    {isLoading && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl animate-in fade-in duration-200">
                            <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
                            <div className="text-center">
                                <p className="font-bold text-lg">데이터 분석 중...</p>
                                <p className="text-sm text-muted-foreground mt-1">불러오는 중 잠시만 기다려주세요</p>
                            </div>
                        </div>
                    )}

                    {!showResults && !isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border bg-card/50">
                            <RefreshCw className="w-10 h-10 text-muted-foreground/20 animate-pulse mb-4" />
                            <h3 className="font-bold text-lg mb-1">분석 대기 중</h3>
                            <p className="text-muted-foreground text-sm text-center">조건을 입력하고 결과를 확인해보세요.</p>
                        </div>
                    ) : (
                        showResults && (
                            <div className="space-y-6 animate-in fade-in duration-500">

                                {/* Chart */}
                                <div className="p-6 rounded-2xl border border-border bg-card">
                                    <div className="flex items-end justify-between mb-6">
                                        <div>
                                            <h3 className="text-base font-bold truncate">
                                                {selectedStock?.name}
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground">{startDate} ~ 현재</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">현재가</p>
                                            <p className="text-xl font-black">
                                                {chartData.length > 0 ? chartData[chartData.length - 1].price.toLocaleString() : "-"}원
                                            </p>
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
                                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                                                                        <p className="text-xs font-black">자산: {payload[0].value.toLocaleString()}원</p>
                                                                        <p className="text-[10px] font-medium text-primary">투자금: {payload[1].value.toLocaleString()}원</p>
                                                                        <p className={`text-[10px] font-bold ${payload[0].payload.profit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                                                                            수익: {payload[0].payload.profit.toLocaleString()}원 ({payload[0].payload.profitRate}%)
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
                                                    dataKey="totalValue"
                                                    stroke="hsl(var(--primary))"
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorValue)"
                                                    animationDuration={1500}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="investedAmount"
                                                    stroke="hsl(var(--muted-foreground))"
                                                    strokeWidth={1.5}
                                                    strokeDasharray="4 4"
                                                    fill="transparent"
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="p-5 rounded-2xl border border-border bg-card">
                                    <div className="flex items-center gap-2 mb-4">
                                        <PieChartIcon className="w-4 h-4 text-primary" />
                                        <h4 className="text-xs font-bold uppercase tracking-wider">포트폴리오 요약</h4>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight">보유 수량</p>
                                            <p className="font-black text-sm">{summary?.totalShares.toFixed(4)} 주</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight">평균 단가</p>
                                            <p className="font-black text-sm">{Math.round(summary?.averagePrice || 0).toLocaleString()}원</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight">예상 자산</p>
                                            <p className="font-black text-sm">{summary?.finalValue.toLocaleString()}원</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight">예상 수익률</p>
                                            <div className="flex items-center gap-1">
                                                <p className={`font-black text-sm ${(summary?.totalProfitRate || 0) >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                                                    {(summary?.totalProfitRate || 0) >= 0 ? "+" : ""}{summary?.totalProfitRate}%
                                                </p>
                                                {(summary?.totalProfitRate || 0) >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                                            </div>
                                        </div>
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
