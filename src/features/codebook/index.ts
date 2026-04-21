export { default as CodebookContent } from "./ui/CodebookContent"
export type { CodebookContentProps } from "./ui/CodebookContent"

export {
  getCodebookDataRsc,
  fetchCodebookMergedVariablesForStudy,
  type CodebookMergedVariablesPayload,
} from "./queries/getCodebookData"

export { computeCodebookValidation } from "./domain/computeCodebookValidation"

// Blitz RPC modules (default exports) are imported from file paths for useMutation / RPC.
