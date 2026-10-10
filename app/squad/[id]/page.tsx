import { SharedSquadView } from "@/app/squad/[id]/SharedSquadView";

export default async function SharedSquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SharedSquadView id={id} />;
}
