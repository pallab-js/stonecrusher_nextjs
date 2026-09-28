import { getSettings, listUsers } from "@/lib/repo/masters";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsView } from "@/components/modules/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const settings = getSettings();
  const users = listUsers();
  return (
    <>
      <PageHeader
        title="Settings"
        description="Unit profile, access control and data management."
      />
      <SettingsView settings={settings} users={users} me={session} />
    </>
  );
}
