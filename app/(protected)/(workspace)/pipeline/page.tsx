import { PanelTop } from "lucide-react";

import { KanbanBoard } from "@/components/kanban/kanban-board";
import { PageHeader } from "@/components/page-header";
import { getDefaultPipelineBoard } from "@/services/pipelines";
import { requireWorkspace } from "@/services/workspace";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const { organization } = await requireWorkspace();
  const board = await getDefaultPipelineBoard(organization.id);

  return (
    <div>
      <div className="px-4 pt-6 pb-5 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Gestão comercial"
          title={board?.pipeline.name ?? "Pipeline"}
          description="Mova os cards entre as etapas; cada alteração fica registrada na timeline."
        />
      </div>
      {board ? (
        <KanbanBoard initialBoard={board} />
      ) : (
        <div className="mx-8 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center">
          <PanelTop className="size-8 text-gray-300" />
          <h2 className="mt-4 text-sm font-semibold text-gray-800">
            Nenhum pipeline encontrado
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            Conclua a configuração inicial da organização.
          </p>
        </div>
      )}
    </div>
  );
}
