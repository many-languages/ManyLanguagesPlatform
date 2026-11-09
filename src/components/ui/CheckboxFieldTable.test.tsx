// @vitest-environment jsdom
import React, { act } from "react"
// @types/react-dom is not installed in this project, so this import is untyped
// @ts-ignore
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { Form } from "./Form"
import CheckboxFieldTable from "./CheckboxFieldTable"

// Vitest compiles JSX with the classic runtime here, so components expect a global React
;(globalThis as { React?: typeof React }).React = React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const Schema = z.object({
  selectedIds: z.array(z.number()).min(1, "Please select at least one"),
})

type Root = { render(node: React.ReactNode): void; unmount(): void }

describe("CheckboxFieldTable", () => {
  let container: HTMLDivElement
  let root: Root

  // Index 0 is the "select all" header checkbox; rows follow in order
  const checkboxes = () =>
    Array.from(container.querySelectorAll<HTMLInputElement>("input[type=checkbox]"))
  const checkedState = () => checkboxes().map((box) => box.checked)

  beforeEach(async () => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(
        <Form schema={Schema} defaultValues={{ selectedIds: [] }} onSubmit={async () => {}}>
          <CheckboxFieldTable
            name="selectedIds"
            options={[
              { id: 1, label: "a@example.com" },
              { id: 2, label: "b@example.com" },
            ]}
          />
        </Form>
      )
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it("shows a row as checked after clicking it", async () => {
    await act(async () => checkboxes()[2].click())

    expect(checkedState()).toEqual([false, false, true])
    expect(container.textContent).not.toContain("Please select at least one")
  })

  it("unchecks a row on a second click and then shows the validation message", async () => {
    await act(async () => checkboxes()[1].click())
    await act(async () => checkboxes()[1].click())

    expect(checkedState()).toEqual([false, false, false])
    expect(container.textContent).toContain("Please select at least one")
  })

  it("selects and deselects every row from the header checkbox", async () => {
    await act(async () => checkboxes()[0].click())
    expect(checkedState()).toEqual([true, true, true])

    await act(async () => checkboxes()[0].click())
    expect(checkedState()).toEqual([false, false, false])
  })
})
