import Image from "next/image";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div
      className={
        inverse
          ? "flex h-11 w-[190px] overflow-hidden rounded-[12px] bg-white shadow-[0_10px_24px_rgba(84,67,220,0.22)] ring-1 ring-white/20"
          : "flex h-11 w-[190px] overflow-hidden rounded-[12px]"
      }
      aria-label="RevFlow"
    >
      <Image
        src="/revflow-logo.png"
        alt="RevFlow"
        width={768}
        height={512}
        priority
        className="h-11 w-[190px] object-cover object-center"
      />
    </div>
  );
}
