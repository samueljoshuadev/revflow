import type { MirrorTower } from "@/types/crm";
import type {
  DevelopmentStage,
  DevelopmentUnitStatus,
  Tables,
} from "@/types/database";

export const unitStatusLabels: Record<DevelopmentUnitStatus, string> = {
  available: "Disponível",
  in_proposal: "Em proposta",
  reserved: "Reservada",
  sold: "Vendida",
  rented: "Alugada",
  blocked: "Bloqueada",
};

/** Cores da grade do espelho e das legendas. */
export const unitStatusStyles: Record<DevelopmentUnitStatus, string> = {
  available: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  in_proposal: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
  reserved: "border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100",
  sold: "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100",
  rented: "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100",
  blocked: "border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-200",
};

export const unitStatusDots: Record<DevelopmentUnitStatus, string> = {
  available: "bg-emerald-500",
  in_proposal: "bg-amber-500",
  reserved: "bg-orange-500",
  sold: "bg-blue-500",
  rented: "bg-violet-500",
  blocked: "bg-gray-400",
};

export const unitStatusOrder: DevelopmentUnitStatus[] = [
  "available",
  "in_proposal",
  "reserved",
  "sold",
  "rented",
  "blocked",
];

/** Status que o admin pode definir manualmente. `in_proposal` é do fluxo de propostas. */
export const manualUnitStatuses = [
  "available",
  "reserved",
  "sold",
  "rented",
  "blocked",
] as const satisfies readonly DevelopmentUnitStatus[];

export const developmentStageLabels: Record<DevelopmentStage, string> = {
  pre_launch: "Pré-lançamento",
  launch: "Lançamento",
  under_construction: "Em obras",
  ready: "Pronto para morar",
};

export function isOrganizationAdmin(role: string) {
  return role === "owner" || role === "admin";
}

/** Agrupa unidades por bloco e andar (andares do mais alto para o mais baixo). */
export function buildMirror(
  towers: Tables<"development_towers">[],
  units: Tables<"development_units">[],
): MirrorTower[] {
  const byTower = new Map<string | null, Tables<"development_units">[]>();
  for (const unit of units) {
    const list = byTower.get(unit.tower_id) ?? [];
    list.push(unit);
    byTower.set(unit.tower_id, list);
  }

  const groups: Array<{ tower: Tables<"development_towers"> | null; units: Tables<"development_units">[] }> =
    towers.map((tower) => ({ tower, units: byTower.get(tower.id) ?? [] }));
  const loose = byTower.get(null);
  if (loose?.length) groups.push({ tower: null, units: loose });

  return groups.map(({ tower, units: towerUnits }) => {
    const floors = new Map<number | null, Tables<"development_units">[]>();
    for (const unit of towerUnits) {
      const list = floors.get(unit.floor) ?? [];
      list.push(unit);
      floors.set(unit.floor, list);
    }
    return {
      tower,
      floors: [...floors.entries()]
        .sort(([a], [b]) => {
          if (a === null) return 1;
          if (b === null) return -1;
          return b - a;
        })
        .map(([floor, floorUnits]) => ({
          floor,
          units: floorUnits.sort(
            (a, b) =>
              a.position - b.position ||
              a.code.localeCompare(b.code, "pt-BR", { numeric: true }),
          ),
        })),
    };
  });
}
