"use client"

import { useCallback, useMemo, useState } from "react"
import { toast } from "react-hot-toast"

import {
  computeCandidateGroupPrefixes,
  findWinningGroupKey,
  pruneNestedParentGroups,
  variableHasDescriptionCoverage,
  wouldOverlapExistingGroupKeys,
} from "../domain/codebookGroups"
import { getCodebookValidationAlerts } from "../domain/codebookValidation"
import type {
  CodebookContentSnapshot,
  CodebookGroupEntry,
  CodebookInitialGroup,
  CodebookInitialVariable,
  VariableCodebookEntry,
} from "../types"

function mapInitialVariables(initialVariables: CodebookInitialVariable[]): VariableCodebookEntry[] {
  return initialVariables.map((v) => ({
    id: v.id,
    variableKey: v.variableKey,
    variableName: v.variableName,
    dslKey: v.dslKey,
    type: v.type,
    examples: v.examples ?? [],
    description: v.description ?? "",
    personalData: v.personalData ?? false,
  }))
}

function mapInitialGroups(initialGroups: CodebookInitialGroup[]): CodebookGroupEntry[] {
  return pruneNestedParentGroups(
    initialGroups.map((g) => ({
      groupKey: g.groupKey,
      description: g.description ?? "",
      personalData: g.personalData,
      childVariablesOpen: false,
    }))
  )
}

export interface UseCodebookEditorOptions {
  initialVariables: CodebookInitialVariable[]
  initialGroups: CodebookInitialGroup[]
  codebook: CodebookContentSnapshot | null
  approvedExtractionId: number | null
  approvedExtractionApprovedAt: Date | string | null
}

export function useCodebookEditor({
  initialVariables,
  initialGroups,
  codebook,
  approvedExtractionId,
  approvedExtractionApprovedAt,
}: UseCodebookEditorOptions) {
  const [variables, setVariables] = useState<VariableCodebookEntry[]>(() =>
    mapInitialVariables(initialVariables)
  )
  const [groups, setGroups] = useState<CodebookGroupEntry[]>(() => mapInitialGroups(initialGroups))
  const [codebookSaved, setCodebookSaved] = useState(true)
  const [showGroupModal, setShowGroupModal] = useState(false)

  const markDirty = useCallback(() => setCodebookSaved(false), [])

  const validationAlerts = useMemo(
    () =>
      getCodebookValidationAlerts({
        codebook,
        approvedExtractionId,
        approvedExtractionApprovedAt,
      }),
    [codebook, approvedExtractionId, approvedExtractionApprovedAt]
  )

  const groupKeys = useMemo(() => groups.map((g) => g.groupKey), [groups])

  const ungroupedVariables = useMemo(
    () => variables.filter((v) => findWinningGroupKey(v.dslKey, groupKeys) === undefined),
    [variables, groupKeys]
  )

  const candidateGroups = useMemo(
    () => computeCandidateGroupPrefixes(variables, groupKeys),
    [variables, groupKeys]
  )

  const hasMissingDescriptions = useMemo(
    () => variables.some((v) => !variableHasDescriptionCoverage(v.dslKey, v.description, groups)),
    [variables, groups]
  )

  const hasAnyDescription = useMemo(
    () =>
      variables.some((v) => (v.description ?? "").trim() !== "") ||
      groups.some((g) => g.description.trim() !== ""),
    [variables, groups]
  )

  const showSavedBadge = codebookSaved && hasAnyDescription

  const getChildVariablesForGroup = useCallback(
    (groupKey: string) =>
      variables.filter((v) => findWinningGroupKey(v.dslKey, groupKeys) === groupKey),
    [variables, groupKeys]
  )

  const updateVariable = useCallback(
    (id: number, field: keyof VariableCodebookEntry, value: string | boolean) => {
      setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
      markDirty()
    },
    [markDirty]
  )

  const updateGroup = useCallback(
    (
      groupKey: string,
      field: keyof Omit<CodebookGroupEntry, "groupKey" | "childVariablesOpen">,
      value: string | boolean
    ) => {
      setGroups((prev) => prev.map((g) => (g.groupKey === groupKey ? { ...g, [field]: value } : g)))
      markDirty()
    },
    [markDirty]
  )

  const setGroupChildVariablesOpen = useCallback((groupKey: string, open: boolean) => {
    setGroups((prev) =>
      prev.map((g) => (g.groupKey === groupKey ? { ...g, childVariablesOpen: open } : g))
    )
  }, [])

  const removeGroup = useCallback(
    (groupKey: string) => {
      setGroups((prev) => prev.filter((g) => g.groupKey !== groupKey))
      markDirty()
    },
    [markDirty]
  )

  const handleCreateGroup = useCallback(
    (prefix: string) => {
      if (!prefix) return
      if (wouldOverlapExistingGroupKeys(prefix, groupKeys)) {
        toast.error(
          "This prefix overlaps an existing group. Remove the other group first, or choose a different depth."
        )
        return
      }
      setGroups((prev) => [
        ...prev,
        {
          groupKey: prefix,
          description: "",
          personalData: false,
          childVariablesOpen: true,
        },
      ])
      markDirty()
      setShowGroupModal(false)
    },
    [groupKeys, markDirty]
  )

  return {
    variables,
    groups,
    codebookSaved,
    setCodebookSaved,
    showGroupModal,
    setShowGroupModal,
    validationAlerts,
    groupKeys,
    ungroupedVariables,
    candidateGroups,
    hasMissingDescriptions,
    showSavedBadge,
    getChildVariablesForGroup,
    updateVariable,
    updateGroup,
    setGroupChildVariablesOpen,
    removeGroup,
    handleCreateGroup,
  }
}
