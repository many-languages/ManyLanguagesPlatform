import { Prisma } from "db"

export const studyScalarSelect = Prisma.validator<Prisma.StudySelect>()({
  id: true,
  createdAt: true,
  title: true,
  description: true,
  status: true,
  startDate: true,
  endDate: true,
  sampleSize: true,
  payment: true,
  length: true,
  jatosStudyUUID: true,
  adminApproved: true,
  adminReviewedAt: true,
  adminReviewedById: true,
  archived: true,
  archivedAt: true,
  archivedById: true,
})

export const latestJatosStudyUploadSelect = Prisma.validator<Prisma.JatosStudyUploadSelect>()({
  id: true,
  createdAt: true,
  studyId: true,
  versionNumber: true,
  jatosStudyId: true,
  jatosFileName: true,
  jatosComponentId: true,
  jatosComponentUUID: true,
  jatosBatchId: true,
  jatosWorkerType: true,
  buildHash: true,
  hashAlgorithm: true,
  approvedExtractionId: true,
  step1Completed: true,
  step2Completed: true,
  step3Completed: true,
  step4Completed: true,
  step5Completed: true,
  step6Completed: true,
})

export const latestJatosStudyUploadWithRelationsSelect =
  Prisma.validator<Prisma.JatosStudyUploadSelect>()({
    ...latestJatosStudyUploadSelect,
    approvedExtraction: {
      select: {
        id: true,
        approvedAt: true,
        pilotDatasetSnapshot: {
          select: { pilotRunIds: true },
        },
      },
    },
  })

export const studyWithRelationsArgs = Prisma.validator<Prisma.StudyDefaultArgs>()({
  select: {
    ...studyScalarSelect,
    jatosStudyUploads: {
      orderBy: { createdAt: "desc" },
      take: 1,
      select: latestJatosStudyUploadWithRelationsSelect,
    },
    researchers: {
      select: { id: true, userId: true, role: true },
    },
    participations: {
      select: { userId: true },
    },
    FeedbackTemplate: {
      select: { id: true },
    },
  },
})

export const participantStudyOverviewArgs = Prisma.validator<Prisma.StudyDefaultArgs>()({
  select: {
    id: true,
    title: true,
    description: true,
    status: true,
    startDate: true,
    endDate: true,
    sampleSize: true,
    payment: true,
    length: true,
    archived: true,
    jatosStudyUploads: {
      orderBy: { createdAt: "desc" },
      take: 1,
      select: {
        jatosStudyId: true,
        jatosWorkerType: true,
        step1Completed: true,
        step2Completed: true,
        step3Completed: true,
        step4Completed: true,
        step5Completed: true,
        step6Completed: true,
      },
    },
  },
})

export const studyWithLatestUploadSelect = Prisma.validator<Prisma.StudySelect>()({
  ...studyScalarSelect,
  jatosStudyUploads: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: latestJatosStudyUploadSelect,
  },
})

export const adminStudyWithLatestUploadArgs = Prisma.validator<Prisma.StudyDefaultArgs>()({
  select: {
    id: true,
    createdAt: true,
    title: true,
    description: true,
    status: true,
    jatosStudyUUID: true,
    adminApproved: true,
    archived: true,
    FeedbackTemplate: {
      select: {
        id: true,
        content: true,
      },
    },
    codebook: {
      select: {
        entries: {
          orderBy: { variableName: "asc" },
          select: {
            variableKey: true,
            variableName: true,
            description: true,
            personalData: true,
          },
        },
      },
    },
    jatosStudyUploads: {
      orderBy: { createdAt: "desc" },
      take: 1,
      select: {
        id: true,
        step1Completed: true,
        step2Completed: true,
        step3Completed: true,
        step4Completed: true,
        step5Completed: true,
        step6Completed: true,
        jatosWorkerType: true,
        jatosFileName: true,
      },
    },
  },
})

export const pendingAdminApprovalStudySelect = Prisma.validator<Prisma.StudySelect>()({
  id: true,
  title: true,
  description: true,
  FeedbackTemplate: { select: { createdAt: true } },
  researchers: { select: { userId: true, role: true, id: true } },
  jatosStudyUploads: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      id: true,
      step1Completed: true,
      step2Completed: true,
      step3Completed: true,
      step4Completed: true,
      step5Completed: true,
      step6Completed: true,
      jatosWorkerType: true,
      jatosFileName: true,
    },
  },
})

export const participantWithEmailArgs = Prisma.validator<Prisma.ParticipantStudyDefaultArgs>()({
  include: { user: { select: { email: true } } },
})
