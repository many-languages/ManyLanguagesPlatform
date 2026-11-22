import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import db, { type NotificationAudience, type UserRole } from "db"

const mocks = vi.hoisted(() => ({
  sendNotification: vi.fn(),
}))

vi.mock("@/src/app/blitz-server", () => ({ getBlitzContext: vi.fn() }))
vi.mock("../services/sendNotification", () => ({ sendNotification: mocks.sendNotification }))

import { notifyAdminsOfPendingStudyReview } from "../services/notifyAdminsOfPendingStudyReview"
import { notificationAudienceForRole } from "../utils/audience"
import { findLatestUnreadNotificationsForUser } from "./getLatestUnreadNotifications"
import { findNotificationsForUser } from "./getNotifications"
import { getNotificationMenuDataForUser } from "./getNotificationMenuData"
import { getUnreadNotificationCountForUser } from "./getUnreadNotificationCount"

const TEST_PREFIX = "notification-audience-db-test"

let counter = 0
const unique = () => `${Date.now()}-${counter++}`

async function createUser(name: string, ...roles: UserRole[]) {
  return db.user.create({
    data: { email: `${TEST_PREFIX}-${name}-${unique()}@example.com`, roles },
  })
}

async function createNotificationFor(
  userId: number,
  audience: NotificationAudience,
  message: string
) {
  return db.notification.create({
    data: {
      message: `${TEST_PREFIX} ${message}`,
      audience,
      recipients: { create: { userId } },
    },
  })
}

async function createStudy(researcherId: number) {
  return db.study.create({
    data: {
      title: `${TEST_PREFIX} study ${unique()}`,
      description: "notification audience test",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      sampleSize: 1,
      payment: "none",
      length: "1 minute",
      researchers: { create: { userId: researcherId, role: "PI" } },
    },
  })
}

describe("notification audience", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendNotification.mockResolvedValue({ notificationId: 1 })
  })

  afterEach(async () => {
    await db.notification.deleteMany({ where: { message: { startsWith: TEST_PREFIX } } })
    await db.study.deleteMany({ where: { title: { startsWith: TEST_PREFIX } } })
    await db.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  })

  it("maps the role a user is acting as to an inbox", () => {
    expect(notificationAudienceForRole("ADMIN")).toBe("ADMIN")
    expect(notificationAudienceForRole("SUPERADMIN")).toBe("ADMIN")
    expect(notificationAudienceForRole("RESEARCHER")).toBe("PORTAL")
    expect(notificationAudienceForRole("PARTICIPANT")).toBe("PORTAL")
    expect(notificationAudienceForRole(undefined)).toBe("PORTAL")
  })

  it("gives a researcher-and-admin account a separate inbox, feed and unread badge per role", async () => {
    const dual = await createUser("dual", "RESEARCHER", "ADMIN")
    await createNotificationFor(dual.id, "PORTAL", "study approved")
    await createNotificationFor(dual.id, "ADMIN", "study awaiting review")
    await createNotificationFor(dual.id, "ADMIN", "another study awaiting review")

    const portalFeed = await findNotificationsForUser(dual.id, "PORTAL")
    const adminFeed = await findNotificationsForUser(dual.id, "ADMIN")
    expect(portalFeed.map((n) => n.notification.message)).toEqual([`${TEST_PREFIX} study approved`])
    expect(adminFeed).toHaveLength(2)
    expect(adminFeed.every((n) => n.notification.message.includes("awaiting review"))).toBe(true)

    await expect(getUnreadNotificationCountForUser(dual.id, "PORTAL")).resolves.toBe(1)
    await expect(getUnreadNotificationCountForUser(dual.id, "ADMIN")).resolves.toBe(2)
    await expect(findLatestUnreadNotificationsForUser(dual.id, "PORTAL")).resolves.toHaveLength(1)
    await expect(getNotificationMenuDataForUser(dual.id, "ADMIN")).resolves.toMatchObject({
      unreadCount: 2,
    })
  })

  describe("review notifications to admins", () => {
    it("reach every account holding an admin role, even one currently acting as a researcher", async () => {
      const researcher = await createUser("researcher", "RESEARCHER")
      const admin = await createUser("admin", "ADMIN")
      const superadmin = await createUser("superadmin", "SUPERADMIN")
      const dual = await createUser("dual", "RESEARCHER", "ADMIN")
      await createUser("participant", "PARTICIPANT")
      const study = await createStudy(researcher.id)

      await notifyAdminsOfPendingStudyReview({ studyId: study.id, studyTitle: "Study" })

      expect(mocks.sendNotification).toHaveBeenCalledTimes(1)
      const call = mocks.sendNotification.mock.calls[0][0]
      expect([...call.recipients].sort()).toEqual([admin.id, superadmin.id, dual.id].sort())
      expect(call.audience).toBe("ADMIN")
    })

    it("skip admins who are researchers on the study, since they cannot review it", async () => {
      const admin = await createUser("admin", "ADMIN")
      const dual = await createUser("dual", "RESEARCHER", "ADMIN")
      const study = await createStudy(dual.id)

      await notifyAdminsOfPendingStudyReview({ studyId: study.id, studyTitle: "Study" })

      expect(mocks.sendNotification.mock.calls[0][0].recipients).toEqual([admin.id])
    })

    it("are not sent at all when the only admin is the study's own researcher", async () => {
      const dual = await createUser("dual", "RESEARCHER", "ADMIN")
      const study = await createStudy(dual.id)

      await expect(
        notifyAdminsOfPendingStudyReview({ studyId: study.id, studyTitle: "Study" })
      ).resolves.toBeNull()
      expect(mocks.sendNotification).not.toHaveBeenCalled()
    })
  })
})
