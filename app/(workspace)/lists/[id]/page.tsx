import { LiveListDetail } from "@/app/components/live/list-detail";
import { requireSession } from "@/lib/require-session";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  return <LiveListDetail key={id} id={id} />;
}
