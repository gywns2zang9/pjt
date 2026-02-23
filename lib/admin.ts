// .env.local의 ADMIN_UID 또는 NEXT_PUBLIC_ADMIN_UID 환경변수로 설정
const ADMIN_UID = process.env.ADMIN_UID ?? process.env.NEXT_PUBLIC_ADMIN_UID ?? null;

export function checkIsAdmin(uid: string | null | undefined): boolean {
    if (!ADMIN_UID || !uid) return false;
    return uid === ADMIN_UID;
}
