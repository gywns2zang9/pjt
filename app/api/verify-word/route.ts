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

        // fetch 타임아웃을 10초로 연장 (충분히 기다려줌)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(apiUrl, {
            method: "GET",
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error(`Dictionary API Error Response [${word}]: Status ${res.status}`);
            // 사전 서버가 아예 응답을 거부(502/503)한 경우에만 503 반환 -> 클라이언트 재시도
            return NextResponse.json({
                valid: false,
                reason: "stdict-api-error",
                status: res.status
            }, { status: 503 });
        }

        const text = await res.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error(`Dictionary JSON Parse Error [${word}]: Response might not be JSON.`);
            return NextResponse.json({
                valid: false,
                reason: "stdict-malformed-response"
            }, { status: 502 });
        }

        // 국립국어원 API는 결과가 없으면 data.channel.item이 없거나 빈 배열임
        const items = data.channel?.item || [];

        if (items && items.length > 0) {
            const firstItem = items[0];
            const senseList = Array.isArray(firstItem.sense) ? firstItem.sense : [firstItem.sense];
            const bestSense = senseList[0];

            let definition = bestSense?.definition || "";
            let pos = bestSense?.pos || firstItem.pos || "";

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

        // 🟢 여기가 중요: API 호출은 '성공'했지만 단어가 '없는' 경우입니다. 
        // 200 OK와 함께 valid: false를 주면 게임에서 즉시 "등록되지 않은 단어"로 처리됩니다. (재시도 안 함)
        return NextResponse.json({
            valid: false,
            reason: "stdict-not-found"
        });

    } catch (e: any) {
        const isTimeout = e.name === 'AbortError';
        console.error(`Dictionary API Exception [${word}]: ${isTimeout ? 'Timeout (10s)' : e.message}`);

        // 진짜 시스템 에러인 경우에만 503 -> 클라이언트 재시도
        return NextResponse.json({
            valid: false,
            reason: "stdict-exception",
            message: e.message
        }, { status: 503 });
    }
}
