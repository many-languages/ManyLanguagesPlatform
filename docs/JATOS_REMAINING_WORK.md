# JATOS: Remaining Work

This document lists what is **not yet implemented** and what **remains** from the two JATOS plans, broken down by phase. It is derived from [JATOS_REFACTOR_PLAN.md](./JATOS_REFACTOR_PLAN.md) and [JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md](./JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md).

---

## Summary

| Plan                         | Phases | Status                              |
| ---------------------------- | ------ | ----------------------------------- |
| **JATOS Refactor Plan**      | 1–5    | ✅ Complete                         |
| **JATOS User-Scoped Tokens** | 1–2    | ✅ Complete                         |
| **JATOS User-Scoped Tokens** | 3      | ✅ Complete                         |
| **JATOS User-Scoped Tokens** | 4–7    | ✅ Complete                         |
| **JATOS User-Scoped Tokens** | 8–10   | Phase 8 ❌; Phase 9 ⚠️; Phase 10 ✅ |

---

## JATOS Refactor Plan — Status

### Phase 1: Foundation — ✅ DONE

All items implemented.

### Phase 2: jatosAccessService — ✅ DONE

All items implemented.

### Phase 3: Migrate Call Sites — ✅ DONE

All items implemented.

### Phase 4: Remove API Routes and Dead Code — ✅ DONE

All items implemented.

### Phase 5: Cleanup — ✅ DONE

All items implemented.

### Optional: Folder Structure (Per-File Migration Map)

The refactor plan’s **utils/parsers** migration map is not fully applied. Some modules remain in `client/` instead of `utils/` or `parsers/`:

| Current location                         | Target per plan                         |
| ---------------------------------------- | --------------------------------------- |
| `client/parseJatosZip.ts`                | `parsers/parseJatosZip.ts`              |
| `client/matchJatosDataToMetadata.ts`     | `utils/matchJatosDataToMetadata.ts`     |
| `client/findStudyResultIdByComment.ts`   | `utils/findStudyResultIdByComment.ts`   |
| `client/getComponentMap.ts`              | `utils/getComponentMap.ts`              |
| `client/studyHasParticipantResponses.ts` | `utils/studyHasParticipantResponses.ts` |
| `client/checkPilotCompletion.ts`         | `utils/checkPilotCompletion.ts`         |
| `client/generateJatosRunUrl.ts`          | `utils/generateJatosRunUrl.ts`          |
| `utils/extractJatosStudyUuid.ts`         | `parsers/extractJatosStudyUuid.ts`      |

**Impact:** Low. Behavior is correct; this is organizational only.

### Critical Constraint: Concurrency — ✅ DONE

**Plan:** “tokenBroker must prevent duplicate concurrent refresh/provision for the same researcher or service identity.”

**Status:** Implemented. `getOrGenerateJatosToken` uses a per-`jatosUserId` promise-based lock (`inFlightPromises` map); concurrent requests for the same `jatosUserId` await the same in-flight promise, so token generation runs only once.

---

## JATOS User-Scoped Tokens Plan — Status by Phase

### Phase 1: Database Schema — ✅ DONE

- `ResearcherJatos` model
- `SystemConfig` model (for service account)

### Phase 2: Admin Provisioning API — ✅ DONE

- Admin libs in `client/`
- Provisioning orchestration
- Import flow

### Phase 3: Service Account Setup — ✅ DONE

| Item                                        | Status                                                                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 `SystemConfig` schema                   | ✅ Done                                                                                                                                       |
| 3.2 `ensureServiceAccount.ts`               | ✅ Done                                                                                                                                       |
| 3.2 `scripts/ensure-service-account.ts`     | ✅ Done                                                                                                                                       |
| 3.2 Startup integration (Docker entrypoint) | ✅ Done — `ensure-service-account` runs after `prisma migrate deploy` in both `docker-compose.yml` (dev) and `docker-compose.prod.yml` (prod) |
| 3.3 `serviceAccount.ts`                     | ✅ Done                                                                                                                                       |
| 3.4 Service account at import               | ✅ Done (in `importJatosStudy.ts`)                                                                                                            |

### Phase 4: Token Resolution — ✅ DONE

- `getTokenForResearcher` (in tokenBroker)
- `getTokenForStudyService` (in tokenBroker)
- `getServiceAccountToken` (in tokenBroker, legacy)

### Phase 5: Lib Function Updates — ✅ DONE

Handled by refactor; client methods require `auth: JatosAuth`.

### Phase 6: Call Site Updates — ✅ DONE

Handled by refactor; call sites use `jatosAccessService`.

### Phase 7: Membership Sync — ✅ DONE

| Item                                              | Status                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `removeResearcherFromJatosStudy.ts`               | ✅ Done                                                                          |
| `ensureResearcherJatosMember` in `createStudy`    | ✅ Done (edge case: study already has upload)                                    |
| `removeResearcherFromJatosStudy` in `deleteStudy` | ✅ Done                                                                          |
| Membership sync at import                         | ✅ Done — `importJatosStudy` and `importJatos` sync all researchers on the study |

**Note:** The only mutation that creates `StudyResearcher` is `createStudy` (PI via nested create). There is no invite-researcher flow. Membership sync is centralized at import time; no audit of other mutations needed.

### Phase 8: Migration for Existing Data — ❌ NOT DONE

| Item                                           | Status         |
| ---------------------------------------------- | -------------- |
| `scripts/provision-existing-researchers.ts`    | ❌ Not created |
| `scripts/provision-service-account-studies.ts` | ❌ Not created |
| Makefile/package.json targets                  | ❌ Not added   |

**Remaining:**

1. **`scripts/provision-existing-researchers.ts`**

   - Find all Users with role RESEARCHER who have at least one `StudyResearcher`
   - For each researcher without `ResearcherJatos`: call `provisionResearcherJatos(userId)`
   - For each researcher’s studies: call `ensureResearcherJatosMember(userId, jatosStudyId)`
   - Log progress and errors

2. **`scripts/provision-service-account-studies.ts`**

   - Call `ensureServiceAccount()` to ensure service account exists
   - Find all `JatosStudyUpload` records
   - For each: call `addStudyMember({ studyId: jatosStudyId, userId: serviceUserId })`
   - Log progress and errors

3. **Add npm/Makefile targets**
   - `provision-researchers`
   - `provision-service-studies`

**Run order for existing deployments:**

1. Deploy new code (with `SystemConfig` migration and startup `ensureServiceAccount`)
2. On first startup, `ensureServiceAccount` runs (once startup integration is done)
3. Run `provision-existing-researchers`
4. Run `provision-service-account-studies`

### Phase 9: Documentation and Configuration — ⚠️ PARTIALLY DONE

| Item                                              | Status                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `JATOS_API_USAGE.md`                              | ✅ Updated                                                               |
| `JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md` | ✅ Updated                                                               |
| `DEPLOYMENT.md`                                   | ✅ Updated — service account provisioning and migration steps documented |
| `.env.example` comments                           | ⚠️ Optional — add comments for JATOS_TOKEN, etc.                         |

**Remaining:**

1. ~~**`DEPLOYMENT.md`**~~ ✅ Done — service account auto-provisioning and migration steps documented

### Phase 10: Setup Safeguards — ✅ DONE

| Item                             | Status  |
| -------------------------------- | ------- |
| `src/lib/startupGuards.ts`       | ✅ Done |
| `instrumentation.ts`             | ✅ Done |
| `scripts/validate-setup.ts`      | ✅ Done |
| Makefile `validate-setup` target | ✅ Done |

---

## Implementation Order (Recommended)

1. ~~**Phase 3 completion** — Add startup integration for `ensure-service-account`~~ ✅ Done
2. ~~**Phase 7 verification** — Audit all `StudyResearcher` create paths~~ ✅ Done (no other create paths exist)
3. **Phase 8** — Migration scripts and targets
4. ~~**Phase 9 completion** — Update `DEPLOYMENT.md`~~ ✅ Done
5. ~~**Phase 10** — Setup safeguards~~ ✅ Done
6. ~~**Optional** — Concurrency fix in tokenBroker~~ ✅ Done
7. **Optional** — Folder structure (utils/parsers) per refactor plan

---

## Related Documents

- [JATOS_REFACTOR_PLAN.md](./JATOS_REFACTOR_PLAN.md)
- [JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md](./JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md)
- [JATOS_API_USAGE.md](./JATOS_API_USAGE.md)
