import { unstable_cache } from "next/cache";
import { format } from "date-fns";
import https from "https";
import fs from "fs";
import path from "path";
import unzipper from "unzipper";
import iconv from "iconv-lite";

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
}

const fetchNewKISToken = unstable_cache(
    async () => {
        const res = await fetch(`${process.env.KIS_URL}/oauth2/tokenP`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "client_credentials",
                appkey: process.env.KIS_APP_KEY,
                appsecret: process.env.KIS_APP_SECRET,
            }),
        });

        if (!res.ok) {
            throw new Error(`KIS Auth Failed: ${res.status}`);
        }

        const data = await res.json();
        return data.access_token as string;
    },
    ["kis_access_token"],
    { revalidate: 72000, tags: ["kis_token"] } // 20시간 유효
);

// Master List Cache
let masterListCache: StockSearchResult[] = [];
let masterListLastUpdated: number = 0;

const CACHE_FILE_PATH = path.join(process.cwd(), ".stock-master-cache.json");

/**
 * 한국투자증권 마스터 파일 다운로드 및 파싱 함수
 */
async function loadMasterListFromKIS(): Promise<StockSearchResult[]> {
    const list: StockSearchResult[] = [];

    const downloadAndParse = (url: string, exchange: string, fileName: string) => {
        return new Promise<void>((resolve, reject) => {
            https.get(url, (res) => {
                res.pipe(unzipper.Parse())
                    .on('entry', (entry: any) => {
                        if (entry.path === fileName) {
                            let chunks: Buffer[] = [];
                            entry.on('data', (d: Buffer) => chunks.push(d));
                            entry.on('end', () => {
                                const buffer = Buffer.concat(chunks);
                                // KIS .mst 파일은 EUC-KR로 인코딩되어 있음
                                const text = iconv.decode(buffer, 'euc-kr');
                                const lines = text.split('\n');

                                for (const line of lines) {
                                    if (!line || line.length < 50) continue;

                                    // 마스터 파일 포맷:
                                    // 0~8 : 표준코드
                                    // 9~20: 단축코드 (ex: KR7005930003) -> 필요시
                                    // 21~60: 한글종목명 (이름 + 여백 + 종류코드 등)
                                    // 템플릿: KOSPI: 제일 처음 9바이트 안에 단축코드 존재
                                    const rawCode = line.substring(0, 9).trim();

                                    // 실제 6자리 종목코드만 정규식으로 안전하게 추출
                                    const shortCodeMatch = rawCode.match(/\d{6}/);
                                    if (!shortCodeMatch) continue;
                                    const shortCode = shortCodeMatch[0];

                                    // 한글 종목명 (21바이트 ~ 60바이트 사이)
                                    const nameRaw = line.substring(21, 61);

                                    // KIS 파일 특징: "삼성전자       ST10" 형태이므로
                                    // 1. 다중 공백으로 분리
                                    // 2. 맨 첫 덩어리만 쓰거나, 불필요한 ST10, EF 등을 제거
                                    // 우선 공백 기준 2개 이상 연속으로 띄워진 곳 앞부분만 이름으로 취함
                                    const name = nameRaw.split(/\s{2,}/)[0].trim();

                                    // 파생/ETF 필터링 로직 개선
                                    // if-buy 에서는 일반 상장주식 및 우선주 모두 검색 가능하게 함
                                    if (name && !name.includes('KODEX') && !name.includes('TIGER') && !name.includes('채권')) {
                                        list.push({
                                            symbol: shortCode,
                                            name: name,
                                            exchange: exchange,
                                            type: "STOCK"
                                        });
                                    }
                                }
                                resolve();
                            });
                        } else {
                            entry.autodrain();
                        }
                    })
                    .on('error', reject);
            }).on('error', reject);
        });
    };

    try {
        // 코스피 주식 마스터
        await downloadAndParse("https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip", "KOSPI", "kospi_code.mst");

        // 코스닥 주식 마스터
        await downloadAndParse("https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip", "KOSDAQ", "kosdaq_code.mst");

        // 최적화를 위해 로컬 시스템에 캐시 저장
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(list));
        masterListLastUpdated = Date.now();
        masterListCache = list;
    } catch (e) {
        console.error("Failed to download master list from KIS", e);
        // 다운로드 실패 시 로컬 캐시 사용 시도
        if (fs.existsSync(CACHE_FILE_PATH)) {
            masterListCache = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf-8'));
            masterListLastUpdated = Date.now();
        }
    }

    return list;
}

/**
 * StockService: 한국투자증권(KIS) API 전용 통신
 */
export const StockService = {
    /**
     * KIS Access Token 발급 및 관리
     */
    async getKISAccessToken(): Promise<string> {
        try {
            const token = await fetchNewKISToken();
            return token;
        } catch (error) {
            console.error("Token fetch failed:", error);
            throw error;
        }
    },

    /**
     * 종목 검색 (한국투자증권 자체 마스터 데이터 파싱본 사용)
     */
    async search(query: string): Promise<StockSearchResult[]> {
        if (!query || query.length < 2) return [];

        // 마스터 데이터 리스트가 비어있거나 24시간이 지났다면 갱신
        const now = Date.now();
        if (masterListCache.length === 0 || (now - masterListLastUpdated > 1000 * 60 * 60 * 24)) {
            if (fs.existsSync(CACHE_FILE_PATH) && masterListCache.length === 0) {
                masterListCache = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf-8'));
                masterListLastUpdated = Date.now();
            } else {
                await loadMasterListFromKIS();
            }
        }

        const exactQuery = query.toLowerCase();

        // 1. 이름이 완전히 일치하는 것 우선
        const exactMatches = masterListCache.filter(item =>
            item.name.toLowerCase() === exactQuery || item.symbol === exactQuery
        );

        // 2. 이름에 검색어가 포함된 것들 추출하여 텍스트가 짧은 것(연관도가 높은 것)부터 정렬
        const partialMatches = masterListCache.filter(item =>
            item.name.toLowerCase().includes(exactQuery) &&
            item.name.toLowerCase() !== exactQuery &&
            item.symbol !== exactQuery
        ).sort((a, b) => a.name.length - b.name.length);

        return [...exactMatches, ...partialMatches].slice(0, 10);
    },

    /**
     * 과거 데이터 조회 (한국투자증권 API 사용)
     * 기간별 일봉 데이터를 100영업일 단위로 페이징하여 요청 기간(최대 10년치 등) 전체 데이터를 가져옵니다.
     */
    async getHistory(symbol: string, start: string, end: string): Promise<StockHistoryData[]> {
        const token = await this.getKISAccessToken();

        let allData: any[] = [];
        let currentEndDate = end.replace(/-/g, "");
        const targetStartDate = start.replace(/-/g, "");

        // 무한루프 방지: 최대 35번 반복 (영업일 기준 100일씩 대략 10년 이상 치 커버 가능)
        for (let i = 0; i < 35; i++) {
            // KIS 일봉 조회 API 엔드포인트: 국내주식 기간별 시세(일/주/월) [v1_국내주식-010]
            const url = `${process.env.KIS_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${symbol}&FID_INPUT_DATE_1=${targetStartDate}&FID_INPUT_DATE_2=${currentEndDate}&FID_PERIOD_DIV_CODE=D&FID_ORG_ADJ_PRC=0`;

            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "authorization": `Bearer ${token}`,
                    "appkey": process.env.KIS_APP_KEY!,
                    "appsecret": process.env.KIS_APP_SECRET!,
                    "tr_id": "FHKST03010100", // "국내주식 기간별 시세" 고유 TR_ID
                },
            });

            if (!res.ok) {
                if (allData.length > 0) break; // 이미 받아둔 데이터가 있다면 반환
                throw new Error(`KIS History API failed: ${res.status}`);
            }

            const data = await res.json();

            if (data.rt_cd !== "0") {
                if (allData.length > 0) break;
                throw new Error(`KIS API Error: ${data.msg1}`);
            }

            const items = data.output2 || [];

            // 응답 중 빈 칸 데이터는 무시 처리 (예: 상장 이전)
            const validItems = items.filter((day: any) => day.stck_bsop_date && day.stck_bsop_date.trim() !== "");
            if (validItems.length === 0) break;

            // KIS 데이터는 날짜순 내림차순 (최신순)
            allData = allData.concat(validItems);

            // 해당 청크의 가장 오래된 날짜(마지막 요소)
            const oldestDateStr = validItems[validItems.length - 1].stck_bsop_date;

            if (oldestDateStr <= targetStartDate) {
                break; // 목표 기준일까지 모두 가져왔으면 종료
            }

            // 가장 오래된 날짜(oldestDateStr)의 하루 전시점으로 다음 끝날짜(EndDate) 설정
            const oldDate = new Date(`${oldestDateStr.slice(0, 4)}-${oldestDateStr.slice(4, 6)}-${oldestDateStr.slice(6, 8)}`);
            oldDate.setDate(oldDate.getDate() - 1);

            const prevY = oldDate.getFullYear();
            const prevM = String(oldDate.getMonth() + 1).padStart(2, '0');
            const prevD = String(oldDate.getDate()).padStart(2, '0');
            currentEndDate = `${prevY}${prevM}${prevD}`;

            if (currentEndDate < targetStartDate) break;

            // KIS API 호출율 제한 (초당 20건)을 회피하기 위해 50ms 대기 (10년 조회시 약 1.5초 소요)
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // 받아온 전체 데이터를 타겟 날짜 이후만 필터링한 뒤, 가장 오래된 날짜부터(Ascending) 보여주기 위해 정렬
        return allData
            .filter((day: any) => day.stck_bsop_date >= targetStartDate)
            .map((day: any) => ({
                date: new Date(`${day.stck_bsop_date.slice(0, 4)}-${day.stck_bsop_date.slice(4, 6)}-${day.stck_bsop_date.slice(6, 8)}`),
                open: parseInt(day.stck_oprc),
                high: parseInt(day.stck_hgpr),
                low: parseInt(day.stck_lwpr),
                close: parseInt(day.stck_clpr),
                volume: parseInt(day.acml_vol),
            }))
            .reverse();
    }
};

