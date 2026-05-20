/** Open when the entry still needs a description; closed when already filled in. */
export function codebookCardDefaultOpen(description: string | null | undefined): boolean {
  return (description ?? "").trim() === ""
}

export function codebookCardHasDescription(description: string | null | undefined): boolean {
  return !codebookCardDefaultOpen(description)
}
