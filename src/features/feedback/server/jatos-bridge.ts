/**
 * Temporary boundary for `src/lib/jatos/jatosAccessService.ts` → feedback.
 * `lib/` must not deep-import `features/` internals; this module is the single
 * allowed entry until PR-C inverts the dependency (see `studies-feature-migration.md` §5.2).
 *
 * Delete this file in PR-C when extraction helpers live under `features/studies/`.
 */
export { computeAggregatedAcrossStatsForTemplate } from "../domain/computeAggregatedAcrossStats"
export { templateUsesStatAcross } from "../domain/statAcrossKeys"
