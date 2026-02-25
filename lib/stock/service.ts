export interface StockSearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
}

export interface StockHistoryData {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjClose?: number;
}

/**
 * StockService: API 연동 대기 상태
 * 현재 데이터 API가 결정되지 않아 빈 함수 본체만 유지합니다.
 */
export const StockService = {
    /**
     * 종목 검색 (API 미결정)
     */
    async search(query: string): Promise<StockSearchResult[]> {
        // TODO: 향후 결정된 데이터 API (FDR, KIS 등) 연동 필요
        return [];
    },

    /**
     * 과거 데이터 조회 (API 미결정)
     */
    async getHistory(symbol: string, start: string, end: string): Promise<StockHistoryData[]> {
        // TODO: 향후 결정된 데이터 API (FDR, KIS 등) 연동 필요
        return [];
    }
};

