import InspectionApp from "@/components/InspectionApp";
import { configuredModels } from "@/lib/meta-client";

// Modellanzeige vor dem ersten Lauf; mit Cache Components zur Build-Zeit aus OPEN_WEIGHTS gelesen
export default function Home() {
  return (
    <main className="min-h-screen">
      <InspectionApp configuredModels={configuredModels()} />
    </main>
  );
}
