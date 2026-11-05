import Link from "next/link";

import {
  unitStatusDots,
  unitStatusLabels,
  unitStatusOrder,
  unitStatusStyles,
} from "@/lib/developments";
import { cn } from "@/lib/utils";
import type { MirrorTower } from "@/types/crm";

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

function floorLabel(floor: number | null) {
  if (floor === null) return "—";
  if (floor === 0) return "Térreo";
  if (floor < 0) return `Subsolo ${-floor}`;
  return `${floor}º`;
}

export function MirrorLegend({ counts }: { counts?: Partial<Record<(typeof unitStatusOrder)[number], number>> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
      {unitStatusOrder.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", unitStatusDots[status])} />
          {unitStatusLabels[status]}
          {counts && <span className="font-semibold text-gray-900">{counts[status] ?? 0}</span>}
        </li>
      ))}
    </ul>
  );
}

export function MirrorGrid({
  developmentId,
  mirror,
  selectedUnitId,
}: {
  developmentId: string;
  mirror: MirrorTower[];
  selectedUnitId?: string;
}) {
  return (
    <div className="space-y-5">
      {mirror.map(({ tower, floors }) => (
        <section key={tower?.id ?? "loose"} className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900">{tower?.name ?? "Unidades sem bloco"}</h2>
          {floors.length === 0 ? (
            <p className="mt-3 text-xs text-gray-400">Nenhuma unidade cadastrada neste bloco.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="border-separate border-spacing-1.5">
                <tbody>
                  {floors.map(({ floor, units }) => (
                    <tr key={floor ?? "none"}>
                      <th scope="row" className="sticky left-0 z-10 w-16 bg-white pr-2 text-right text-[11px] font-medium whitespace-nowrap text-gray-400">
                        {floorLabel(floor)}
                      </th>
                      {units.map((unit) => (
                        <td key={unit.id} className="p-0">
                          <Link
                            href={`/developments/${developmentId}?unit=${unit.id}`}
                            scroll={false}
                            aria-label={`Unidade ${unit.code}: ${unitStatusLabels[unit.status]}`}
                            className={cn(
                              "flex h-14 w-20 flex-col items-center justify-center rounded-lg border text-center transition",
                              unitStatusStyles[unit.status],
                              selectedUnitId === unit.id && "ring-2 ring-[#172033] ring-offset-1",
                            )}
                          >
                            <span className="text-xs font-semibold">{unit.code}</span>
                            <span className="mt-0.5 text-[10px] opacity-80">{compactCurrency.format(unit.list_price)}</span>
                          </Link>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
