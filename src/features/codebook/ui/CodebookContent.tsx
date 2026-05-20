"use client"

import { forwardRef, useEffect, useImperativeHandle } from "react"

import { getCodebookStepState } from "../domain/codebookStep"
import { useCodebookEditor } from "../hooks/useCodebookEditor"
import { useCodebookSave } from "../hooks/useCodebookSave"
import type { CodebookContentProps, CodebookContentRef } from "../types"
import { Alert } from "@/src/components/ui/Alert"
import {
  ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE,
  canEditStudySetup,
} from "@/src/features/studies/domain/studyEditability"
import CodebookArchivedAlert from "./CodebookArchivedAlert"
import CodebookCreateGroupBanner from "./CodebookCreateGroupBanner"
import CodebookCreateGroupModal from "./CodebookCreateGroupModal"
import CodebookGroupCard from "./CodebookGroupCard"
import CodebookInstructionsCard from "./CodebookInstructionsCard"
import CodebookSaveToolbar from "./CodebookSaveToolbar"
import CodebookValidationAlerts from "./CodebookValidationAlerts"
import CodebookVariableCard from "./CodebookVariableCard"

export type { CodebookContentProps, CodebookContentRef, CodebookStepState } from "../types"

const CodebookContent = forwardRef<CodebookContentRef, CodebookContentProps>(
  (
    {
      initialVariables,
      initialGroups,
      codebook,
      approvedExtractionId,
      approvedExtractionApprovedAt,
      study,
      onStepStateChange,
    },
    ref
  ) => {
    const canEditSetup = canEditStudySetup(study)

    const editor = useCodebookEditor({
      initialVariables,
      initialGroups,
      codebook,
      approvedExtractionId,
      approvedExtractionApprovedAt,
    })

    const { isSaving, saveCodebook } = useCodebookSave({
      studyId: study.id,
      variables: editor.variables,
      groups: editor.groups,
      canEditSetup,
      onSaved: () => editor.setCodebookSaved(true),
    })

    useEffect(() => {
      onStepStateChange?.(
        getCodebookStepState({
          canEditSetup,
          variableCount: editor.variables.length,
          hasMissingDescriptions: editor.hasMissingDescriptions,
          archivedStudyMessage: ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE,
        })
      )
    }, [canEditSetup, editor.hasMissingDescriptions, editor.variables.length, onStepStateChange])

    useImperativeHandle(ref, () => ({
      saveCodebook,
    }))

    if (editor.variables.length === 0) {
      return (
        <>
          {!canEditSetup && <CodebookArchivedAlert message={ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE} />}
          <Alert variant="warning">
            No variables found. Please complete step 4 (Debug + approve extraction) first to extract
            variables from your pilot data.
          </Alert>
        </>
      )
    }

    return (
      <>
        {!canEditSetup && <CodebookArchivedAlert message={ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE} />}

        <CodebookInstructionsCard />

        <CodebookSaveToolbar
          isSaved={editor.showSavedBadge}
          isSaving={isSaving}
          onSave={saveCodebook}
          showExpandCollapse={editor.groups.length > 0 || editor.ungroupedVariables.length > 0}
          allCardsExpanded={editor.allCardsExpanded}
          onToggleAllCardsOpen={editor.toggleAllCardsOpen}
        />

        <CodebookValidationAlerts alerts={editor.validationAlerts} />

        {editor.candidateGroups.length > 0 && (
          <CodebookCreateGroupBanner
            candidateCount={editor.candidateGroups.length}
            onCreateGroup={() => editor.setShowGroupModal(true)}
          />
        )}

        <div className="mb-6 space-y-4">
          {editor.groups.map((group) => (
            <CodebookGroupCard
              key={group.groupKey}
              group={group}
              open={editor.isGroupCardOpen(group.groupKey, group.description)}
              onOpenChange={(open) => editor.setGroupCardOpen(group.groupKey, open)}
              childVariables={editor.getChildVariablesForGroup(group.groupKey)}
              onUpdateGroup={(field, value) => editor.updateGroup(group.groupKey, field, value)}
              onRemoveGroup={() => editor.removeGroup(group.groupKey)}
            />
          ))}

          {editor.ungroupedVariables.map((variable) => (
            <CodebookVariableCard
              key={variable.id}
              variable={variable}
              open={editor.isVariableCardOpen(variable.id, variable.description)}
              onOpenChange={(open) => editor.setVariableCardOpen(variable.id, open)}
              onUpdateVariable={(field, value) => editor.updateVariable(variable.id, field, value)}
            />
          ))}
        </div>

        <CodebookCreateGroupModal
          open={editor.showGroupModal}
          onClose={() => editor.setShowGroupModal(false)}
          candidateGroups={editor.candidateGroups}
          variables={editor.variables}
          onCreateGroup={editor.handleCreateGroup}
        />
      </>
    )
  }
)

CodebookContent.displayName = "CodebookContent"

export default CodebookContent
