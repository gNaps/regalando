import { InviteEntry } from "@/app/components/live/invite-entry";
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteEntry key={token} token={token} />;
}
