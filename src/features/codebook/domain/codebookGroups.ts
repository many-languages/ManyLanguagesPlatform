/**
 * Codebook group helpers. Groups use dslKey path prefixes; at most one group may
 * apply per variable — group keys must not be nested (ancestor/descendant).
 */

export type CodebookGroupLike = {
  groupKey: string
  description?: string | null
  personalData?: boolean
}

/** True when `dslKey` is a strict descendant of `groupKey` in the path tree. */
export function isCoveredByGroupKey(dslKey: string, groupKey: string): boolean {
  return dslKey.startsWith(groupKey + ".")
}

/** True when two group keys are the same or one is an ancestor of the other. */
export function groupKeysOverlap(a: string, b: string): boolean {
  if (a === b) return true
  return isCoveredByGroupKey(a, b) || isCoveredByGroupKey(b, a)
}

/** First overlapping pair in `groupKeys`, or null if the set is mutually exclusive. */
export function findOverlappingGroupKeyPair(groupKeys: string[]): [string, string] | null {
  for (let i = 0; i < groupKeys.length; i++) {
    for (let j = i + 1; j < groupKeys.length; j++) {
      if (groupKeysOverlap(groupKeys[i], groupKeys[j])) {
        return [groupKeys[i], groupKeys[j]]
      }
    }
  }
  return null
}

export function assertMutuallyExclusiveGroupKeys(groupKeys: string[]): void {
  const pair = findOverlappingGroupKeyPair(groupKeys)
  if (pair) {
    throw new Error(
      `Group keys "${pair[0]}" and "${pair[1]}" overlap. Use a single grouping depth — ` +
        `you cannot group both a parent path and a nested path for the same variables.`
    )
  }
}

/** True if `candidateKey` is nested with any existing key (ancestor or descendant). */
export function wouldOverlapExistingGroupKeys(
  candidateKey: string,
  existingKeys: string[]
): boolean {
  return existingKeys.some((gk) => groupKeysOverlap(candidateKey, gk))
}

/**
 * Among groups that cover `dslKey`, return the most specific (longest `groupKey`).
 * When group keys are mutually exclusive, at most one group matches.
 */
export function findWinningGroup<T extends CodebookGroupLike>(
  dslKey: string,
  groups: T[]
): T | undefined {
  let winner: T | undefined
  for (const g of groups) {
    if (!isCoveredByGroupKey(dslKey, g.groupKey)) continue
    if (
      !winner ||
      g.groupKey.length > winner.groupKey.length ||
      (g.groupKey.length === winner.groupKey.length && g.groupKey > winner.groupKey)
    ) {
      winner = g
    }
  }
  return winner
}

export function findWinningGroupKey(dslKey: string, groupKeys: string[]): string | undefined {
  let winner: string | undefined
  for (const groupKey of groupKeys) {
    if (!isCoveredByGroupKey(dslKey, groupKey)) continue
    if (
      !winner ||
      groupKey.length > winner.length ||
      (groupKey.length === winner.length && groupKey > winner)
    ) {
      winner = groupKey
    }
  }
  return winner
}

/** Drop parent groups when a more specific nested group exists in the same list. */
export function pruneNestedParentGroups<T extends CodebookGroupLike>(groups: T[]): T[] {
  return groups.filter(
    (g) =>
      !groups.some(
        (other) => other.groupKey !== g.groupKey && other.groupKey.startsWith(g.groupKey + ".")
      )
  )
}

export function variableHasDescriptionCoverage(
  dslKey: string,
  variableDescription: string | null | undefined,
  groups: CodebookGroupLike[]
): boolean {
  if ((variableDescription?.trim() ?? "") !== "") return true
  const winner = findWinningGroup(dslKey, groups)
  return (winner?.description?.trim() ?? "") !== ""
}

export type CandidateGroupPrefix = { prefix: string; count: number }

/**
 * Prefixes shared by ≥minCount ungrouped variables, excluding keys already grouped
 * or nested with an existing group.
 */
export function computeCandidateGroupPrefixes(
  variables: { dslKey: string }[],
  groupKeys: string[],
  minCount = 2
): CandidateGroupPrefix[] {
  const ungrouped = variables.filter((v) => findWinningGroupKey(v.dslKey, groupKeys) === undefined)

  const prefixCounts = new Map<string, number>()
  for (const v of ungrouped) {
    const segments = v.dslKey.split(".")
    for (let i = 1; i < segments.length; i++) {
      const prefix = segments.slice(0, i).join(".")
      prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1)
    }
  }

  const dslKeys = new Set(ungrouped.map((v) => v.dslKey))

  return Array.from(prefixCounts.entries())
    .filter(
      ([prefix, count]) =>
        prefix !== "" &&
        !dslKeys.has(prefix) &&
        count >= minCount &&
        !groupKeys.includes(prefix) &&
        !wouldOverlapExistingGroupKeys(prefix, groupKeys)
    )
    .map(([prefix, count]) => ({ prefix, count }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix))
}
