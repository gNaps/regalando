import LiveListsPage from "@/app/components/live/list-overview";
import { requireSession } from "@/lib/require-session";

export default async function ListsPage() {
  await requireSession();
  return <LiveListsPage />;
}
