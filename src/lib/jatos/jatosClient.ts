/**
 * Barrel for jatosClient — auth-injected, stateless, transport-only.
 * All methods require auth: JatosAuth. Caller provides the appropriate token.
 */
export type { JatosAuth, GetResultsDataResponse, AssetStructureResponse } from "./client/types"
export { getAssetStructure } from "./client/getAssetStructure"
export { getResultsMetadata } from "./client/getResultsMetadata"
export { getResultsData } from "./client/getResultsData"
export { getStudyProperties } from "./client/getStudyProperties"
export { fetchStudyCodes } from "./client/fetchStudyCodes"
export { deleteJatosStudy } from "./client/deleteStudy"
export {
  createJatosUser,
  type CreateJatosUserParams,
  type CreateJatosUserResponse,
} from "./client/createJatosUser"
export {
  createJatosUserToken,
  type CreateJatosUserTokenParams,
  type CreateJatosUserTokenResponse,
} from "./client/createJatosUserToken"
export { addStudyMember, type AddStudyMemberParams } from "./client/addStudyMember"
export { removeStudyMember, type RemoveStudyMemberParams } from "./client/removeStudyMember"
