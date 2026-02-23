"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/admin";

type ConfigUpdate = {
    status?: string;
    show_on_works?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    game_config?: Record<string, any>;
};

export async function updateProjectConfig(id: string, updates: ConfigUpdate) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!checkIsAdmin(user?.id)) throw new Error("Unauthorized");

    const { error } = await supabase
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

    const { error } = await supabase
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

export async function resetChosungRanking() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!checkIsAdmin(user?.id)) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("chosung_scores")
        .delete()
        .gte("score", 0); // 전체 삭제
    if (error) throw error;
}
