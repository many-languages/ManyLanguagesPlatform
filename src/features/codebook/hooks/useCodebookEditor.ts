"use client"

import { useCallback, useMemo, useState } from "react"
import { toast } from "react-hot-toast"

import { codebookCardDefaultOpen } from "../domain/codebookCardOpen"
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
    }))
  )
}

export interface CodebookCardOpenState {
  groups: Record<string, boolean>
  variables: Record<number, boolean>
}

function buildInitialCardOpenState(
  groups: CodebookGroupEntry[],
  variables: VariableCodebookEntry[],
  groupKeys: string[]
): CodebookCardOpenState {
  const ungrouped = variables.filter((v) => findWinningGroupKey(v.dslKey, groupKeys) === undefined)
  return {
    groups: Object.fromEntries(
      groups.map((g) => [g.groupKey, codebookCardDefaultOpen(g.description)])
    ),
    variables: Object.fromEntries(
      ungrouped.map((v) => [v.id, codebookCardDefaultOpen(v.description)])
    ),
  }
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
  const [cardOpen, setCardOpen] = useState<CodebookCardOpenState>(() => {
    const mappedGroups = mapInitialGroups(initialGroups)
    const mappedVariables = mapInitialVariables(initialVariables)
    const keys = mappedGroups.map((g) => g.groupKey)
    return buildInitialCardOpenState(mappedGroups, mappedVariables, keys)
  })
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
      field: keyof Omit<CodebookGroupEntry, "groupKey">,
      value: string | boolean
    ) => {
      setGroups((prev) => prev.map((g) => (g.groupKey === groupKey ? { ...g, [field]: value } : g)))
      markDirty()
    },
    [markDirty]
  )

  const removeGroup = useCallback(
    (groupKey: string) => {
      setGroups((prev) => prev.filter((g) => g.groupKey !== groupKey))
      setCardOpen((prev) => {
        const { [groupKey]: _removed, ...groups } = prev.groups
        return { ...prev, groups }
      })
      markDirty()
    },
    [markDirty]
  )

  const setGroupCardOpen = useCallback((groupKey: string, open: boolean) => {
    setCardOpen((prev) => ({
      ...prev,
      groups: { ...prev.groups, [groupKey]: open },
    }))
  }, [])

  const setVariableCardOpen = useCallback((variableId: number, open: boolean) => {
    setCardOpen((prev) => ({
      ...prev,
      variables: { ...prev.variables, [variableId]: open },
    }))
  }, [])

  const expandAllCards = useCallback(() => {
    setCardOpen({
      groups: Object.fromEntries(groups.map((g) => [g.groupKey, true])),
      variables: Object.fromEntries(ungroupedVariables.map((v) => [v.id, true])),
    })
  }, [groups, ungroupedVariables])

  const collapseAllCards = useCallback(() => {
    setCardOpen({
      groups: Object.fromEntries(groups.map((g) => [g.groupKey, false])),
      variables: Object.fromEntries(ungroupedVariables.map((v) => [v.id, false])),
    })
  }, [groups, ungroupedVariables])

  const isGroupCardOpen = useCallback(
    (groupKey: string, description: string) =>
      cardOpen.groups[groupKey] ?? codebookCardDefaultOpen(description),
    [cardOpen.groups]
  )

  const isVariableCardOpen = useCallback(
    (variableId: number, description: string | null) =>
      cardOpen.variables[variableId] ?? codebookCardDefaultOpen(description),
    [cardOpen.variables]
  )

  const allCardsExpanded = useMemo(() => {
    if (groups.length === 0 && ungroupedVariables.length === 0) return false
    const groupsExpanded = groups.every((g) => isGroupCardOpen(g.groupKey, g.description))
    const variablesExpanded = ungroupedVariables.every((v) =>
      isVariableCardOpen(v.id, v.description)
    )
    return groupsExpanded && variablesExpanded
  }, [groups, ungroupedVariables, isGroupCardOpen, isVariableCardOpen])

  const toggleAllCardsOpen = useCallback(() => {
    if (allCardsExpanded) {
      collapseAllCards()
    } else {
      expandAllCards()
    }
  }, [allCardsExpanded, collapseAllCards, expandAllCards])

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
        },
      ])
      setCardOpen((prev) => ({
        ...prev,
        groups: { ...prev.groups, [prefix]: true },
      }))
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
    removeGroup,
    handleCreateGroup,
    isGroupCardOpen,
    isVariableCardOpen,
    setGroupCardOpen,
    setVariableCardOpen,
    allCardsExpanded,
    toggleAllCardsOpen,
  }
}
