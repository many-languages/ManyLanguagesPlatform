import styles from "./feedback.module.css"

const editorSurface = "color-mix(in srgb, hsl(var(--b1)) 85%, white 15%)"
const helperSurface = "color-mix(in srgb, hsl(var(--b2)) 80%, white 20%)"
const helperSectionSurface = "color-mix(in srgb, hsl(var(--b1)) 90%, white 10%)"

/**
 * Shared style objects for MDEditor components to ensure consistent
 * DaisyUI theme compatibility across all feedback preview panels
 */
export const mdEditorStyles = {
  container: {
    backgroundColor: editorSurface,
    color: "hsl(var(--nc))",
  },
  textarea: {
    backgroundColor: editorSurface,
    color: "hsl(var(--nc))",
  },
  preview: {
    backgroundColor: editorSurface,
    color: "hsl(var(--nc))",
  },
}

export const mdEditorClassName = {
  container: styles.mdEditorContainer,
  preview: styles.mdEditorPreview,
}

export const dslHelperClassName = {
  container: styles.dslHelperContainer,
  section: styles.dslHelperSection,
}

export const dslHelperStyles = {
  container: {
    backgroundColor: helperSurface,
  },
  section: {
    backgroundColor: helperSectionSurface,
  },
}

export { styles as feedbackStyles }
