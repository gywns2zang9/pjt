import { NextRequest, NextResponse } from "next/server";

/**
 * 국립국어원 표준국어대사전 API를 이용한 단어 검증
 * GET /api/verify-word?word=사과
 */
export async function GET(req: NextRequest) {
    const word = req.nextUrl.searchParams.get("word");
    if (!word || word.trim().length === 0) {
        return NextResponse.json({ valid: false, reason: "empty" });
    }

    const dictionaryKey = process.env.DICTIONARY_API_KEY;

    if (!dictionaryKey) {
        return NextResponse.json({
            valid: false,
            reason: "no-api-key"
        }, { status: 500 });
    }

    try {
        const apiUrl = `https://stdict.korean.go.kr/api/search.do?key=${dictionaryKey}&q=${encodeURIComponent(word)}&req_type=json&type_search=search&method=exact`;

        // fetch 타임아웃 설정 (5초)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(apiUrl, {
            method: "GET",
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            // API 응답 자체가 에러인 경우 502/503 반환 -> 클라이언트가 이를 보고 재시도함
            return NextResponse.json({
                valid: false,
                reason: "stdict-api-error",
                status: res.status
            }, { status: res.status >= 500 ? 503 : 502 });
        }

        const text = await res.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            // JSON 파싱 실패 (주로 국립국어원 서버 점검 시 HTML이 옴)
            return NextResponse.json({
                valid: false,
                reason: "stdict-malformed-response"
            }, { status: 502 });
        }

        const items = data.channel?.item || [];

        if (items && items.length > 0) {
            const firstItem = items[0];
            const senseList = Array.isArray(firstItem.sense) ? firstItem.sense : [firstItem.sense];
            const bestSense = senseList[0];

            let definition = bestSense?.definition || "";
            let pos = bestSense?.pos || firstItem.pos || "";

            // HTML 태그와 특수문자 제거
            definition = definition.replace(/<[^>]*>?/gm, "").replace(/\^/g, " ").trim();

            if (definition) {
                return NextResponse.json({
                    valid: true,
                    word: firstItem.word?.replace(/\^/g, "") || word,
                    pos: pos,
                    description: definition,
                    reason: "stdict-found"
                });
            }
        }

        // 검색 결과가 없는 경우는 "성공적으로 검색했지만 단어가 없는 것"이므로 200 OK와 함께 valid: false 반환
        return NextResponse.json({
            valid: false,
            reason: "stdict-not-found"
        });

    } catch (e: any) {
        const isTimeout = e.name === 'AbortError';
        console.error(`Dictionary API Exception: ${isTimeout ? 'Timeout' : e.message}`);

        // 네트워크 연결 오류나 타임아웃 발생 시 503 반환 -> 클라이언트 재시도 발동!
        return NextResponse.json({
            valid: false,
            reason: "stdict-exception",
            message: e.message
        }, { status: 503 });
    }
}
