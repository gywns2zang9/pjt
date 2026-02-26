import { StockHistoryData } from "./service";
import { isSameDay, isMonday, getDate, format } from "date-fns";

export interface SimulationResult {
    date: string;
    totalValue: number;
    investedAmount: number;
    profit: number;
    profitRate: number;
    price: number;
    high: number;
    low: number;
}

export interface Summary {
    finalValue: number;
    totalInvested: number;
    totalShares: number;
    averagePrice: number;
    bestValue: number;
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
        const totalShares = Math.floor(amount / buyPrice);
        const actualInvested = totalShares * buyPrice;

        const chartData = history.map((day, index) => {
            const isLastDay = index === history.length - 1;
            const targetPrice = isLastDay ? day.close : day.open;

            const currentValue = totalShares * targetPrice;
            const profit = currentValue - actualInvested;
            return {
                date: format(day.date, "yyyy-MM-dd"),
                totalValue: Math.round(currentValue),
                investedAmount: actualInvested,
                profit: Math.round(profit),
                profitRate: actualInvested > 0 ? Number(((profit / actualInvested) * 100).toFixed(2)) : 0,
                price: targetPrice,
                high: day.high,
                low: day.low,
            };
        });

        const final = chartData[chartData.length - 1];
        const maxHigh = Math.max(...chartData.map(d => d.high));
        const summary: Summary = {
            finalValue: final.totalValue,
            totalInvested: actualInvested,
            totalShares: totalShares,
            averagePrice: buyPrice,
            bestValue: totalShares * maxHigh,
        };

        return { chartData, summary };
    },

    /**
     * 적립식 투자 시뮬레이션
     */
    simulateDCA(
        history: StockHistoryData[],
        sharesPerPeriod: number,
        startDateStr: string
    ): { chartData: SimulationResult[]; summary: Summary } {
        if (history.length === 0) throw new Error("데이터가 없습니다.");

        let totalInvested = 0;
        let totalShares = 0;

        let lastProcessedMonth = "";
        const startDay = parseInt(startDateStr.split("-")[2], 10);
        if (startDay > 1) {
            lastProcessedMonth = startDateStr.slice(0, 7); // ex: "2026-02"
        }

        const chartData = history.map((day, index) => {
            let shouldBuy = false;

            // 매월 1일(또는 해당 달의 첫 거래일)에 매수
            const monthNum = format(day.date, "yyyy-MM");
            if (monthNum !== lastProcessedMonth) {
                shouldBuy = true;
                lastProcessedMonth = monthNum;
            }

            if (shouldBuy) {
                const buyAmount = sharesPerPeriod * day.open;
                totalInvested += buyAmount;
                totalShares += sharesPerPeriod;
            }

            const isLastDay = index === history.length - 1;
            const targetPrice = isLastDay ? day.close : day.open;

            const currentValue = totalShares * targetPrice;
            const profit = currentValue - totalInvested;

            return {
                date: format(day.date, "yyyy-MM-dd"),
                totalValue: Math.round(currentValue),
                investedAmount: totalInvested,
                profit: Math.round(profit),
                profitRate: totalInvested > 0 ? Number(((profit / totalInvested) * 100).toFixed(2)) : 0,
                price: targetPrice,
                high: day.high,
                low: day.low,
            };
        });

        const final = chartData[chartData.length - 1];
        const maxHigh = Math.max(...chartData.map(d => d.high));
        const summary: Summary = {
            finalValue: final.totalValue,
            totalInvested: totalInvested,
            totalShares: totalShares,
            averagePrice: totalShares > 0 ? totalInvested / totalShares : 0,
            bestValue: totalShares * maxHigh,
        };

        return { chartData, summary };
    }
};
