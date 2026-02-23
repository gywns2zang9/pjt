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

    if (dictionaryKey) {
        try {
            // method=exact를 명시하여 정확한 단어 검색 수행
            const apiUrl = `https://stdict.korean.go.kr/api/search.do?key=${dictionaryKey}&q=${encodeURIComponent(word)}&req_type=json&type_search=search&method=exact`;
            const res = await fetch(apiUrl, { method: "GET" });

            if (res.ok) {
                const data = await res.json();
                const items = data.channel?.item || [];

                if (items.length > 0) {
                    const firstItem = items[0];

                    // 국립국어원 JSON 명세: 뜻풀이(definition)는 sense 객체 또는 배열 내부에 숨어있습니다.
                    const senseList = Array.isArray(firstItem.sense) ? firstItem.sense : [firstItem.sense];
                    const bestSense = senseList[0];

                    let definition = bestSense?.definition || "";
                    let pos = bestSense?.pos || firstItem.pos || "";

                    // HTML 태그와 특수 문자(^) 제거 정제
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
            }
        } catch (e) {
            console.error("Dictionary API Error:", e);
        }
    }

    // 국립국어원 검색 결과가 없거나 뜻이 없는 경우 무조건 false (오답 처리 강화)
    return NextResponse.json({
        valid: false,
        description: null,
        reason: "stdict-not-found"
    });
}
