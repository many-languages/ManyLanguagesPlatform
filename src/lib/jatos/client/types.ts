import type { AssetNode } from "../utils/extractHtmlFilesFromStructure"

/**
 * Auth parameter for all jatosClient methods.
 * Token is always required — never optional.
 */
export type JatosAuth = { token: string }

/**
 * Response from getResultsData. Raw result data as ZIP (ArrayBuffer).
 */
export interface GetResultsDataResponse {
  success: true
  contentType: string
  data: ArrayBuffer
}

/**
 * Response from getAssetStructure. JATOS returns { data: tree } or raw tree.
 * The data field contains the root node (or flat array when flatten=true).
 */
export type AssetStructureResponse = { data?: AssetNode | AssetNode[] } | AssetNode
