import { CheckCircle2, CheckSquare2, Circle, Clock3, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { getTaskData } from "@/services/tasks";
import { requireWorkspace } from "@/services/workspace";

import { createTask, updateTaskStatus } from "./actions";

export const metadata = { title: "Tarefas" };

const priorityLabel = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};
const priorityStyle = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { user, organization } = await requireWorkspace();
  const { tasks, leads, members } = await getTaskData(organization.id);
  const openTasks = tasks.filter(
    (task) => !["completed", "cancelled"].includes(task.status),
  );
  const completed = tasks.filter((task) => task.status === "completed");

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Execução comercial"
        title="Tarefas e follow-ups"
        description={`${openTasks.length} pendentes · ${completed.length} concluídas`}
      />
      {(params.error || params.message) && (
        <p
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {params.error ?? params.message}
        </p>
      )}

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-brand" />
            <h2 className="text-sm font-semibold text-gray-900">Nova tarefa</h2>
          </div>
          <form action={createTask} className="mt-5 space-y-4">
            <Field
              label="Título"
              name="title"
              placeholder="Retornar proposta"
              required
            />
            <div>
              <Label htmlFor="leadId">Lead relacionado</Label>
              <Select id="leadId" name="leadId">
                <option value="">Sem lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="assigneeId">Responsável</Label>
              <Select id="assigneeId" name="assigneeId" defaultValue={user.id}>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.profile?.full_name ??
                      (member.user_id === user.id ? "Você" : "Membro")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select id="priority" name="priority" defaultValue="medium">
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </Select>
              </div>
              <Field label="Vencimento" name="dueAt" type="datetime-local" />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                maxLength={2000}
              />
            </div>
            <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gray-950 text-sm font-medium text-white hover:bg-gray-800">
              <CheckSquare2 className="size-4" /> Criar tarefa
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <TaskList title="Em andamento" tasks={openTasks} />
          <TaskList
            title="Concluídas"
            tasks={completed.slice(0, 30)}
            completed
          />
        </div>
      </div>
    </div>
  );
}

function TaskList({
  title,
  tasks,
  completed = false,
}: {
  title: string;
  tasks: Awaited<ReturnType<typeof getTaskData>>["tasks"];
  completed?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {tasks.length === 0 ? (
        <div className="flex min-h-36 flex-col items-center justify-center">
          <CheckSquare2 className="size-6 text-gray-300" />
          <p className="mt-2 text-sm text-gray-400">
            Nenhuma tarefa nesta lista.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {tasks.map((task) => (
            <article key={task.id} className="flex items-start gap-3 p-5">
              {!completed ? (
                <form action={updateTaskStatus}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="status" value="completed" />
                  <button
                    className="mt-0.5 text-gray-300 hover:text-emerald-600"
                    aria-label="Concluir tarefa"
                  >
                    <Circle className="size-5" />
                  </button>
                </form>
              ) : (
                <CheckCircle2 className="mt-0.5 size-5 text-emerald-500" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={cn(
                      "text-sm font-medium text-gray-900",
                      completed && "text-gray-400 line-through",
                    )}
                  >
                    {task.title}
                  </h3>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-medium",
                      priorityStyle[task.priority],
                    )}
                  >
                    {priorityLabel[task.priority]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {task.lead?.name ?? "Tarefa interna"}
                  {task.assignee?.full_name
                    ? ` · ${task.assignee.full_name}`
                    : ""}
                </p>
                {task.due_at && (
                  <p
                    className={cn(
                      "mt-2 flex items-center gap-1.5 text-[11px]",
                      task.is_overdue && !completed
                        ? "text-red-600"
                        : "text-gray-500",
                    )}
                  >
                    <Clock3 className="size-3.5" />
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(task.due_at))}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  name,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
