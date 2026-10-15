import { FriendsOverview } from "@/app/components/live/friends-overview";
import { requireSession } from "@/lib/require-session";
export default async function FriendsPage() { await requireSession(); return <FriendsOverview />; }
