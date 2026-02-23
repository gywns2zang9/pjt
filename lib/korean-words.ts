/**
 * 국립국어원 표준국어대사전 API를 통한 한국어 단어 검증 (개발용)
 */
export async function isValidKoreanWord(word: string): Promise<{ valid: boolean; description?: string; word?: string; pos?: string }> {
    if (!word || word.length === 0) return { valid: false };

    // 기본: 완성형 한글 음절인지 먼저 확인
    const isHangul = [...word].every((ch) => {
        const code = ch.charCodeAt(0);
        return code >= 0xac00 && code <= 0xd7a3;
    });
    if (!isHangul) return { valid: false };

    try {
        const res = await fetch(`/api/verify-word?word=${encodeURIComponent(word)}`);
        if (!res.ok) return { valid: true }; // API 실패 시 통과
        const data = await res.json();
        return {
            valid: data.valid === true,
            word: data.word,
            pos: data.pos,
            description: data.description
        };
    } catch {
        return { valid: true }; // 네트워크 에러 시 통과
    }
}
