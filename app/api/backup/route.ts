import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { exportBackup } from "@/lib/backup";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const backup = exportBackup();
  const stamp = backup.exported_at.slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="stoneops-backup-${stamp}.json"`,
    },
  });
}
