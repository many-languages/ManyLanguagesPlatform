import { describe, expect, it } from "vitest"
import type { UserRole } from "@/db"
import type { AdminStudyListItemDto } from "../types"
import { getAdminStudyBulkActions } from "./adminStudyBulkActions"

const adminRole = "ADMIN" as UserRole
const superAdminRole = "SUPERADMIN" as UserRole

function study(overrides: Partial<AdminStudyListItemDto> = {}): AdminStudyListItemDto {
  return {
    id: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    title: "Study 1",
    description: null,
    status: "CLOSED",
    jatosStudyUUID: "study-uuid",
    adminApproved: true,
    archived: false,
    hasParticipantResponses: false,
    latestJatosStudyUpload: {
      id: 1,
      step1Completed: true,
      step2Completed: true,
      step3Completed: true,
      step4Completed: true,
      step5Completed: true,
      step6Completed: true,
      jatosWorkerType: "SINGLE",
      jatosFileName: "study.zip",
    },
    feedbackTemplate: { id: 1, content: "template" },
    codebook: { entries: [] },
    ...overrides,
  }
}

describe("getAdminStudyBulkActions", () => {
  it("returns no visible actions or targets when nothing is selected", () => {
    const result = getAdminStudyBulkActions([], adminRole)

    expect(result.showApproveButton).toBe(false)
    expect(result.showRejectButton).toBe(false)
    expect(result.showEnableButton).toBe(false)
    expect(result.deleteEnabled).toBe(false)
    expect(result.approveTargetIds).toEqual([])
    expect(result.enableTargetIds).toEqual([])
  })

  it("targets only pending studies with complete setup for approval", () => {
    const completePending = study({ id: 1, adminApproved: null })
    const incompletePending = study({
      id: 2,
      title: "Incomplete",
      adminApproved: null,
      latestJatosStudyUpload: {
        ...study().latestJatosStudyUpload!,
        id: 2,
        step4Completed: false,
      },
    })

    const result = getAdminStudyBulkActions([completePending, incompletePending], adminRole)

    expect(result.showApproveButton).toBe(true)
    expect(result.showRejectButton).toBe(true)
    expect(result.approveTargetIds).toEqual([1])
    expect(result.rejectTargetIds).toEqual([1, 2])
  })

  it("blocks enabling when selected approved studies have incomplete setup", () => {
    const result = getAdminStudyBulkActions(
      [
        study({
          id: 7,
          title: "Needs setup",
          latestJatosStudyUpload: {
            ...study().latestJatosStudyUpload!,
            id: 7,
            step6Completed: false,
          },
        }),
      ],
      adminRole
    )

    expect(result.showEnableButton).toBe(true)
    expect(result.enableTargetIds).toEqual([])
    expect(result.enableBlockedMessage).toContain("Needs setup")
  })

  it("targets selected approved studies for enable and disable in mixed status selections", () => {
    const closed = study({ id: 1, status: "CLOSED" })
    const open = study({ id: 2, status: "OPEN" })

    const result = getAdminStudyBulkActions([closed, open], adminRole)

    expect(result.showEnableButton).toBe(true)
    expect(result.showDisableButton).toBe(true)
    expect(result.enableTargetIds).toEqual([1, 2])
    expect(result.disableTargetIds).toEqual([1, 2])
  })

  it("allows archiving only when every selected study has participant responses and is unarchived", () => {
    const result = getAdminStudyBulkActions(
      [
        study({ id: 1, hasParticipantResponses: true }),
        study({ id: 2, hasParticipantResponses: true }),
      ],
      adminRole
    )

    expect(result.showArchiveButton).toBe(true)
    expect(result.archiveTargetIds).toEqual([1, 2])
  })

  it("allows unarchiving only when every selected study is archived", () => {
    const result = getAdminStudyBulkActions(
      [study({ id: 1, archived: true }), study({ id: 2, archived: true })],
      adminRole
    )

    expect(result.showUnarchiveButton).toBe(true)
    expect(result.unarchiveTargetIds).toEqual([1, 2])
  })

  it("requires active studies with participant responses to be archived before deletion", () => {
    const result = getAdminStudyBulkActions(
      [study({ hasParticipantResponses: true, archived: false })],
      superAdminRole
    )

    expect(result.deleteEnabled).toBe(false)
    expect(result.deleteTargetIds).toEqual([])
    expect(result.deleteDisabledReason).toContain("must be archived")
  })

  it("hides deletion of archived response data from staff admins but allows it for superadmins", () => {
    const archivedWithResponses = study({ id: 3, archived: true, hasParticipantResponses: true })

    const staffResult = getAdminStudyBulkActions([archivedWithResponses], adminRole)
    const superAdminResult = getAdminStudyBulkActions([archivedWithResponses], superAdminRole)

    expect(staffResult.hideDeleteForStaffAdmin).toBe(true)
    expect(staffResult.deleteEnabled).toBe(false)
    expect(staffResult.deleteTargetIds).toEqual([])
    expect(superAdminResult.hideDeleteForStaffAdmin).toBe(false)
    expect(superAdminResult.deleteEnabled).toBe(true)
    expect(superAdminResult.deleteTargetIds).toEqual([3])
    expect(superAdminResult.deleteConfirmMessage).toContain("long-term archive")
  })
})
