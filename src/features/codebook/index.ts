export { default as CodebookContent } from "./ui/CodebookContent"
export type {
  CodebookContentProps,
  CodebookContentRef,
  CodebookContentSnapshot,
  CodebookStepState,
  VariableCodebookEntry,
  CodebookGroupEntry,
} from "./types"

// Server loaders live in `./index.server.ts`; only erased types are re-exported here.
export type { CodebookMergedVariablesPayload } from "./server/getCodebookData"

// Blitz RPC modules (default exports) are imported from file paths for useMutation / RPC.
