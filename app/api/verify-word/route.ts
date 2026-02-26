import { NextRequest, NextResponse } from "next/server";

/**
 * 국립국어원 표준국어대사전 API를 이용한 단어 검증
 * 서버 내부에서 최대 2회 시도하며(첫 시도 + 재시도 1회), 
 * 모두 실패하거나 타임아웃(각 10초) 발생 시 '사전에 없는 단어'로 간주합니다.
 */
export async function GET(req: NextRequest) {
    const word = req.nextUrl.searchParams.get("word");
    if (!word || word.trim().length === 0) {
        return NextResponse.json({ valid: false, reason: "empty" });
    }

    const dictionaryKey = process.env.DICTIONARY_API_KEY;
    if (!dictionaryKey) {
        return NextResponse.json({ valid: false, reason: "no-api-key" }, { status: 500 });
    }

    const MAX_RETRIES = 2;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const apiUrl = `https://stdict.korean.go.kr/api/search.do?key=${dictionaryKey}&q=${encodeURIComponent(word)}&req_type=json&type_search=search&method=exact`;

            // 각 시도당 10초 타임아웃 (국립국어원 API의 느린 응답 완벽 대비)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(apiUrl, {
                method: "GET",
                signal: controller.signal,
                cache: 'no-store'
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                throw new Error(`Status ${res.status}`);
            }

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error("Malformed JSON");
            }

            const items = data.channel?.item || [];

            if (items && items.length > 0) {
                const firstItem = items[0];
                const senseList = Array.isArray(firstItem.sense) ? firstItem.sense : [firstItem.sense];
                const bestSense = senseList[0];

                let definition = (bestSense?.definition || "").replace(/<[^>]*>?/gm, "").replace(/\^/g, " ").trim();

                if (definition) {
                    return NextResponse.json({
                        valid: true,
                        word: firstItem.word?.replace(/\^/g, "") || word,
                        pos: bestSense?.pos || firstItem.pos || "",
                        description: definition
                    });
                }
            }

            // 검색 결과가 확실히 없는 경우 (정상 응답)
            return NextResponse.json({ valid: false, reason: "stdict-not-found" });

        } catch (e: any) {
            const isTimeout = e.name === 'AbortError';
            console.warn(`Attempt ${attempt} for [${word}] failed: ${isTimeout ? 'Timeout' : e.message}`);

            // 마지막 시도까지 실패한 경우
            if (attempt === MAX_RETRIES) {
                console.error(`All ${MAX_RETRIES} attempts failed for [${word}]. Treating as NOT FOUND.`);
                // 🟢 사용자 요청: 모든 시도 실패 시 서버 오류로 뱉지 않고 '사전에 없는 단어'로 처리
                return NextResponse.json({
                    valid: false,
                    reason: "stdict-fallback-not-found",
                    message: "Internal retry exhausted"
                });
            }

            // 다음 시도 전 아주 짧게 대기 (200ms)
            await new Promise(r => setTimeout(r, 200));
        }
    }

    return NextResponse.json({ valid: false, reason: "stdict-not-found" });
}
