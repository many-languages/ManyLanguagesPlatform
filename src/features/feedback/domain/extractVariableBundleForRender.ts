/**
 * Re-exports variable extraction helpers from `features/studies` for feedback rendering
 * and cohort aggregation. Keeps feedback imports off `src/app/**`.
 */
export {
  extractVariableBundleForRenderFromResults,
  extractVariableBundleForRender,
} from "@/src/features/studies/domain/variables/utils/extractVariable"
