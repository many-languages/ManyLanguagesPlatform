/**
 * Bridge to study variable extraction used by feedback rendering and cohort aggregation.
 * Implementation lives in the app study variables module; lib code should import from here
 * (not from app paths) so `jatosAccessService` stays free of `src/app/**` imports.
 */
export {
  extractVariableBundleForRenderFromResults,
  extractVariableBundleForRender,
} from "@/src/app/(app)/studies/[studyId]/variables/utils/extractVariable"
