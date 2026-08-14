import { redirect } from "next/navigation";

import { SetupRequired } from "@/components/setup-required";
import { isSupabaseConfigured } from "@/lib/env";

export default function HomePage() {
  if (!isSupabaseConfigured()) {
    return <SetupRequired />;
  }
  redirect("/dashboard");
}
