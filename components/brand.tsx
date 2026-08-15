import Image from "next/image";

import type { OrganizationVertical } from "@/types/database";

export function Brand({
  inverse = false,
  vertical = "agency",
}: {
  inverse?: boolean;
  vertical?: OrganizationVertical;
}) {
  const isRealEstate = vertical === "real_estate";
  return (
    <div
      className={
        inverse
          ? "flex h-11 w-[170px] items-center rounded-[12px] bg-white px-2 shadow-[0_10px_24px_rgba(84,67,220,0.18)] ring-1 ring-white/20"
          : "flex h-11 w-[170px] items-center"
      }
      aria-label={isRealEstate ? "RevFlow para Imobiliárias" : "RevFlow"}
    >
      <Image
        src={
          isRealEstate
            ? "/revflow-imobiliarias.png"
            : "/revflow-agencias.png"
        }
        alt={isRealEstate ? "RevFlow para Imobiliárias" : "RevFlow"}
        width={177}
        height={50}
        priority
        className="h-10 w-[154px] object-contain object-left"
      />
    </div>
  );
}
