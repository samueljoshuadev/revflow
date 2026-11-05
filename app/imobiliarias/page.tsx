import { permanentRedirect } from "next/navigation";

/** Endereço antigo: a home já é a página do Loovimob. */
export default function RealEstatePage() {
  permanentRedirect("/");
}
