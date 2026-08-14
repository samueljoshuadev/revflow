"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/services/workspace";

const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000),
  leadId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.uuid().nullable(),
  ),
  assigneeId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.uuid().nullable(),
  ),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueAt: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().datetime({ local: true }).nullable(),
  ),
});

export async function createTask(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    leadId: formData.get("leadId"),
    assigneeId: formData.get("assigneeId"),
    priority: formData.get("priority"),
    dueAt: formData.get("dueAt"),
  });
  if (!parsed.success) redirect("/tasks?error=Revise+os+dados+da+tarefa.");
  const dueAt = parsed.data.dueAt
    ? new Date(parsed.data.dueAt).toISOString()
    : null;

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    organization_id: organization.id,
    lead_id: parsed.data.leadId,
    assignee_id: parsed.data.assigneeId ?? user.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    priority: parsed.data.priority,
    due_at: dueAt,
    created_by: user.id,
  });
  if (error) {
    console.error("task_creation_failed", { code: error.code });
    redirect("/tasks?error=Não+foi+possível+criar+a+tarefa.");
  }
  revalidatePath("/tasks");
  redirect("/tasks?message=Tarefa+criada.");
}

export async function updateTaskStatus(formData: FormData) {
  const { organization } = await requireWorkspace();
  const parsed = z
    .object({
      taskId: z.uuid(),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
    })
    .safeParse({
      taskId: formData.get("taskId"),
      status: formData.get("status"),
    });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: parsed.data.status,
      completed_at:
        parsed.data.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("organization_id", organization.id)
    .eq("id", parsed.data.taskId);
  if (error) console.error("task_status_update_failed", { code: error.code });
  revalidatePath("/tasks");
}
