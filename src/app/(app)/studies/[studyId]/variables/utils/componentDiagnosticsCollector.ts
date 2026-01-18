import type { Diagnostic, DiagnosticCode } from "../types"

/**
 * ComponentDiagnosticsCollector - mutable collector for component-level diagnostics
 *
 * Purpose:
 * - Collects component-level diagnostics during parsing / pre-walk checks
 * - Does NOT aggregate facts: components are few, so we keep it simple and store full diagnostics
 *
 * Notes:
 * - No materializer needed (unlike run-level), because:
 *   - no spam problem
 *   - message construction often needs component-specific context available at call site
 */
export class ComponentDiagnosticsCollector {
  private readonly byComponentId = new Map<number, Diagnostic[]>()

  /**
   * Add a component-level diagnostic.
   * Keeps ordering (useful for debugging), and de-dupes exact (code+message) duplicates per component.
   */
  add(componentId: number, diagnostic: Diagnostic): void {
    const list = this.byComponentId.get(componentId) ?? []

    const isDup = list.some((d) => d.code === diagnostic.code && d.message === diagnostic.message)
    if (!isDup) list.push(diagnostic)

    this.byComponentId.set(componentId, list)
  }

  /**
   * Convenience helpers (optional): keep call sites clean and consistent.
   */
  warn(
    componentId: number,
    code: Exclude<DiagnosticCode, "PARSE_ERROR">,
    message: string,
    metadata?: Diagnostic["metadata"]
  ): void {
    this.add(componentId, { severity: "warning", code, message, metadata })
  }

  error(
    componentId: number,
    code: DiagnosticCode,
    message: string,
    metadata?: Diagnostic["metadata"]
  ): void {
    this.add(componentId, { severity: "error", code, message, metadata })
  }

  /**
   * Snapshot for returning from extractObservations().
   * Copy the map + arrays so callers can't mutate internal state.
   */
  getComponentDiagnostics(): Map<number, Diagnostic[]> {
    return new Map(Array.from(this.byComponentId.entries()).map(([k, v]) => [k, [...v]]))
  }

  hasAny(): boolean {
    return this.byComponentId.size > 0
  }
}
