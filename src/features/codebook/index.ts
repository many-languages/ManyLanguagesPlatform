export { default as CodebookContent } from "./ui/CodebookContent"
export type {
  CodebookContentProps,
  CodebookContentRef,
  CodebookContentSnapshot,
  CodebookStepState,
  VariableCodebookEntry,
  CodebookGroupEntry,
} from "./types"

export {
  getCodebookDataRsc,
  fetchCodebookMergedVariablesForStudy,
  type CodebookMergedVariablesPayload,
} from "./server/getCodebookData"

export { computeCodebookValidation } from "./server/computeCodebookValidation"

// Blitz RPC modules (default exports) are imported from file paths for useMutation / RPC.
