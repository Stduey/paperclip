import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { heartbeatRuns } from "@paperclipai/db";
import { unauthorized } from "../errors.js";

type DbReader = Pick<Db, "select">;

async function findHeartbeatRunId(
  db: DbReader,
  runId: string,
  companyId?: string | null,
  agentId?: string | null,
) {
  const conditions = and(
    eq(heartbeatRuns.id, runId),
    ...(companyId ? [eq(heartbeatRuns.companyId, companyId)] : []),
    ...(agentId ? [eq(heartbeatRuns.agentId, agentId)] : []),
  );
  const run = await db
    .select({ id: heartbeatRuns.id })
    .from(heartbeatRuns)
    .where(conditions)
    .then((rows) => rows[0] ?? null);

  return run?.id ?? null;
}

export async function coerceExistingHeartbeatRunId(
  db: DbReader,
  runId: string | null | undefined,
  companyId?: string | null,
) {
  const candidate = runId?.trim();
  if (!candidate) return null;

  return findHeartbeatRunId(db, candidate, companyId);
}

export async function requireHeartbeatRunIdForAttributedWrite(
  db: DbReader,
  input: {
    runId: string | null | undefined;
    companyId?: string | null;
    agentId?: string | null;
    required?: boolean;
    label?: string;
  },
) {
  const candidate = input.runId?.trim();
  if (!candidate) {
    if (input.required) throw unauthorized(`${input.label ?? "Agent write"} requires a valid Paperclip run id`);
    return null;
  }

  const runId = await findHeartbeatRunId(db, candidate, input.companyId, input.agentId);
  if (!runId) throw unauthorized(`${input.label ?? "Attributed write"} requires a valid Paperclip run id`);

  return runId;
}
