import db, { type Prisma } from "db"

export type AdminAuditEventName =
  | "admin_study_approved"
  | "admin_study_rejected"
  | "data_collection_enabled"
  | "data_collection_disabled"
  | "study_deletion_requested"
  | "jatos_deletion_failed"
  | "study_deleted"

export type AdminAuditEntityType = "Study"

export async function recordAdminAuditEvent(input: {
  actorUserId?: number | null
  actorRole?: string | null
  event: AdminAuditEventName
  entityType: AdminAuditEntityType
  entityId?: number | null
  metadata?: Prisma.InputJsonValue
}) {
  return db.adminAuditEvent.create({
    data: {
      actorUserId: input.actorUserId ?? undefined,
      actorRole: input.actorRole ?? undefined,
      event: input.event,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      metadata: input.metadata ?? undefined,
    },
  })
}
