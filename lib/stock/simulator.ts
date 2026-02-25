import { StockHistoryData } from "./service";
import { isSameDay, isMonday, getDate, format } from "date-fns";

export interface SimulationResult {
    date: string;
    totalValue: number;
    investedAmount: number;
    profit: number;
    profitRate: number;
    price: number;
}

export interface Summary {
    finalValue: number;
    totalInvested: number;
    totalProfit: number;
    totalProfitRate: number;
    totalShares: number;
    averagePrice: number;
}

export const Simulator = {
    /**
     * 거치식 투자 시뮬레이션
     */
    simulateLumpSum(
        history: StockHistoryData[],
        amount: number
    ): { chartData: SimulationResult[]; summary: Summary } {
        if (history.length === 0) throw new Error("데이터가 없습니다.");

        const buyPrice = history[0].open;
        const totalShares = amount / buyPrice;

        const chartData = history.map((day) => {
            const currentValue = totalShares * day.close;
            const profit = currentValue - amount;
            return {
                date: format(day.date, "yyyy-MM-dd"),
                totalValue: Math.round(currentValue),
                investedAmount: amount,
                profit: Math.round(profit),
                profitRate: Number(((profit / amount) * 100).toFixed(2)),
                price: day.close,
            };
        });

        const final = chartData[chartData.length - 1];
        const summary: Summary = {
            finalValue: final.totalValue,
            totalInvested: amount,
            totalProfit: final.profit,
            totalProfitRate: final.profitRate,
            totalShares: totalShares,
            averagePrice: buyPrice,
        };

        return { chartData, summary };
    },

    /**
   * 적립식 투자 시뮬레이션
   */
    simulateDCA(
        history: StockHistoryData[],
        amountPerPeriod: number,
        frequency: "daily" | "weekly" | "monthly",
        dayOfValue: number = 1 // 월급날 등
    ): { chartData: SimulationResult[]; summary: Summary } {
        if (history.length === 0) throw new Error("데이터가 없습니다.");

        let totalInvested = 0;
        let totalShares = 0;
        let lastProcessedMonth = "";
        let lastProcessedWeek = -1;

        const chartData = history.map((day) => {
            let shouldBuy = false;

            if (frequency === "daily") {
                shouldBuy = true;
            } else if (frequency === "weekly") {
                // 주번호가 바뀌면 첫 거래일에 구매
                const weekNum = getWeekNumber(day.date);
                if (weekNum !== lastProcessedWeek) {
                    shouldBuy = true;
                    lastProcessedWeek = weekNum;
                }
            } else if (frequency === "monthly") {
                // 달이 바뀌고 + 날짜가 지정일 이후인 첫 거래일에 구매
                const monthNum = format(day.date, "yyyy-MM");
                if (monthNum !== lastProcessedMonth && getDate(day.date) >= dayOfValue) {
                    shouldBuy = true;
                    lastProcessedMonth = monthNum;
                }
            }

            if (shouldBuy) {
                totalInvested += amountPerPeriod;
                totalShares += amountPerPeriod / day.open;
            }

            const currentValue = totalShares * day.close;
            const profit = currentValue - totalInvested;

            return {
                date: format(day.date, "yyyy-MM-dd"),
                totalValue: Math.round(currentValue),
                investedAmount: totalInvested,
                profit: Math.round(profit),
                profitRate: totalInvested > 0 ? Number(((profit / totalInvested) * 100).toFixed(2)) : 0,
                price: day.close,
            };
        });

        const final = chartData[chartData.length - 1];
        const summary: Summary = {
            finalValue: final.totalValue,
            totalInvested: totalInvested,
            totalProfit: final.profit,
            totalProfitRate: final.profitRate,
            totalShares: totalShares,
            averagePrice: totalInvested / totalShares,
        };

        return { chartData, summary };
    }
};

/**
 * 주 번호 계산 (DCA 주간 매수용)
 */
function getWeekNumber(d: Date) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return (
        1 +
        Math.round(
            ((date.getTime() - week1.getTime()) / 86400000 -
                3 +
                ((week1.getDay() + 6) % 7)) /
            7
        )
    );
}
