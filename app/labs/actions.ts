"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/admin";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminSupabase() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

type ConfigUpdate = {
    show_on_works?: boolean;
    sort_order?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    game_config?: Record<string, any>;
};

export async function updateProjectConfig(id: string, updates: ConfigUpdate) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!checkIsAdmin(user?.id)) throw new Error("Unauthorized");

    const adminSupabase = getAdminSupabase();
    const { error } = await adminSupabase
        .from("project_configs")
        .upsert({ id, ...updates, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;

    revalidatePath("/labs");
    revalidatePath("/works");
}

export async function updateProjectMeta(
    id: string,
    title: string,
    description: string,
    slug: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!checkIsAdmin(user?.id)) throw new Error("Unauthorized");

    const adminSupabase = getAdminSupabase();
    const { error } = await adminSupabase
        .from("project_configs")
        .upsert(
            {
                id,
                title: title.trim() || null,
                description: description.trim() || null,
                slug: slug.trim() || null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
        );
    if (error) throw error;

    revalidatePath("/labs");
    revalidatePath(`/labs/${id}`);
    revalidatePath("/works");
}

export async function resetGameRanking(projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!checkIsAdmin(user?.id)) throw new Error("Unauthorized");

    const tableMap: Record<string, string> = {
        "chosung-game": "chosung_scores",
        "circle-game": "circle_scores",
        "ddong-game": "ddong_scores",
        "eyes-game": "eyes_scores",
        "size-game": "size_scores",
        "sort-game": "sort_scores",
        "speed-game": "speed_scores",
        "touch-game": "touch_scores",
        "arrow-game": "arrow_scores",
        "balloon-game": "balloon_scores",
        "bug-game": "bug_scores",
    };

    const tableName = tableMap[projectId];
    if (!tableName) throw new Error("Invalid project ID for ranking reset");

    const adminSupabase = getAdminSupabase();
    const { error } = await adminSupabase
        .from(tableName)
        .delete()
        .not("id", "is", null);

    if (error) throw error;
}
