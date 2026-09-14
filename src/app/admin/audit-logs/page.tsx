import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Audit logs" };

export default async function AdminAuditLogsPage() {
  const logs = await db.auditLog.findMany({
    include: { actorUser: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Audit logs</h1>
      <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border-brand last:border-0">
                <td className="px-4 py-3 text-xs text-gray-500">{log.createdAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="px-4 py-3 text-gray-700">{log.actorUser ? `${log.actorUser.name} (${log.actorUser.role})` : "System"}</td>
                <td className="px-4 py-3 font-medium text-brand-dark">{log.action.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {log.entityType}
                  {log.entityId ? ` · ${log.entityId.slice(-8)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
