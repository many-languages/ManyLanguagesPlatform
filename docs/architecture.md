# Architecture Index

This document serves as a high-level map to the core architecture and security policies of the ManyLanguages Platform.

If you are looking for how files are organized, start with [**PROJECT_STRUCTURE.md**](PROJECT_STRUCTURE.md).

## Key Architecture Questions

### Where are auth and roles enforced?

Authorization is enforced primarily on the server via Explicit Role Checks and Study Access Helpers.

- **Rules & Boundaries:** See [AUTHORIZATION_MODEL.md](AUTHORIZATION_MODEL.md) for the definitive guide on roles and server entry points.
- **Implementation:** Core checks reside in `src/features/studies/server/` (e.g., `withStudyAccess`, `withStudyWriteAccess`).

### Where are JATOS calls centralized?

All calls to JATOS must go through the dedicated integration service layer. Features and routes are strictly prohibited from making raw HTTP calls to JATOS or importing token/client modules directly.

- **Rules & Usage:** See [JATOS_API_USAGE.md](JATOS_API_USAGE.md).
- **Implementation:** The facade is located at `src/lib/jatos/jatosAccessService.ts`. The only exception is the FormData upload route at `src/app/api/jatos/import/route.ts`.

### How are env variables and secrets validated at startup?

We utilize a two-layer configuration model (Compose vs. Host App).

- **Rules & Setup:** See [`deploy/docs/environment-variables.md`](../deploy/docs/environment-variables.md).
- **Validation Implementation:** Environment variables are strictly validated using Zod at runtime startup.

### Which data may reach the browser?

Server functions should only return UI-safe DTOs to the client. JATOS tokens, raw cohort payloads, and session objects must never be leaked to the client.

- **Rules & Patterns:** See [SERVER_COMPONENT_PATTERNS.md](SERVER_COMPONENT_PATTERNS.md) and [AUTHORIZATION_MODEL.md](AUTHORIZATION_MODEL.md).

### How do participant feedback flows work?

Participant feedback is rendered on the server dynamically using the JATOS result data combined with the stored Feedback Template.

- **Implementation:** Feedback rules live under `src/features/feedback/domain/`.
- **Security:** The participant only sees their own result and aggregated `stat:…:across` cohort data if the template allows it. Raw arrays are never sent.

### How does study deletion and the JATOS lifecycle work?

The app database handles application metadata, while JATOS handles runtime execution files and responses.

- **Lifecycle & Storage:** See [DATA_LIFECYCLE.md](DATA_LIFECYCLE.md) for the split between PostgreSQL and JATOS MySQL.
- **Deletion:** Deleting a study requires coordinated removal from both the app and JATOS. See the "Admin Study Deletion" section in [JATOS_API_USAGE.md](JATOS_API_USAGE.md).
