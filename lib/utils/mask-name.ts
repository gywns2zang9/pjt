/**
 * 이름 마스킹 처리
 * @param name - 원본 이름
 * @returns 마스킹된 이름 (예: "김효준" -> "김효*")
 */
export function maskName(name: string | null | undefined): string {
    if (!name) return "알 수 없음";

    // 2글자 이하는 마지막 글자만 마스킹
    if (name.length <= 2) {
        return name[0] + "*";
    }

    // 3글자 이상은 마지막 글자만 마스킹
    return name.slice(0, -1) + "*";
}
