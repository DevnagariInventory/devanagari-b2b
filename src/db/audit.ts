import { db } from "./index";
import { auditLogs } from "./schema";
import { nowStamp } from "../lib/date";
import { currentUserName } from "../lib/auth/current";

type Runner = Pick<typeof db, "insert">;

/** Record who did what. Pass the transaction as `runner` when called inside one. */
export async function audit(
  action: "create" | "update" | "delete" | "other",
  entity: string,
  entityId: number | string,
  summary: string,
  runner: Runner = db
) {
  await runner
    .insert(auditLogs)
    .values({ at: nowStamp(), action, entity, entityId: String(entityId), summary, userName: await currentUserName() });
}
