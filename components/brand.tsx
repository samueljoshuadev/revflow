import Image from "next/image";

import type { OrganizationVertical } from "@/types/database";

export function Brand({
  inverse = false,
}: {
  inverse?: boolean;
  /** Mantido por compatibilidade; o Loovimob só tem a vertical imobiliária. */
  vertical?: OrganizationVertical;
}) {
  return (
    <div
      className={
        inverse
          ? "flex h-11 w-[170px] items-center rounded-[12px] bg-white px-2 shadow-[0_10px_24px_rgba(84,67,220,0.18)] ring-1 ring-white/20"
          : "flex h-11 w-[170px] items-center"
      }
      aria-label="Loovimob"
    >
      <Image
        src="/loovimob-logo.png"
        alt="Loovimob"
        width={177}
        height={50}
        priority
        className="h-10 w-[154px] object-contain object-left"
      />
    </div>
  );
}
