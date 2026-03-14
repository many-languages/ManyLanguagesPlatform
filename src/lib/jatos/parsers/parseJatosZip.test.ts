import { describe, it, expect } from "vitest"
import { parseJatosZip } from "./parseJatosZip"
import JSZip from "jszip"

async function createMinimalZip(files: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip()
  for (const [filename, content] of Object.entries(files)) {
    zip.file(filename, content)
  }
  return zip.generateAsync({ type: "arraybuffer" })
}

describe("parseJatosZip", () => {
  it("parses ZIP with ArrayBuffer and returns filename/content pairs", async () => {
    const arrayBuffer = await createMinimalZip({
      "result_1/component_1.json": '{"trial": 1}',
      "result_1/component_2.csv": "a,b\n1,2",
    })

    const result = await parseJatosZip(arrayBuffer)

    expect(result).toHaveLength(2)
    const byName = Object.fromEntries(result.map((r) => [r.filename, r.content]))
    expect(byName["result_1/component_1.json"]).toBe('{"trial": 1}')
    expect(byName["result_1/component_2.csv"]).toBe("a,b\n1,2")
  })

  it("parses ZIP with Buffer input", async () => {
    const arrayBuffer = await createMinimalZip({ "data.txt": "hello" })
    const buffer = Buffer.from(arrayBuffer)

    const result = await parseJatosZip(buffer)

    expect(result).toHaveLength(1)
    expect(result[0].filename).toBe("data.txt")
    expect(result[0].content).toBe("hello")
  })

  it("parses ZIP with Blob input", async () => {
    const arrayBuffer = await createMinimalZip({ "blob-test.json": '{"x": 1}' })
    const blob = new Blob([arrayBuffer])

    const result = await parseJatosZip(blob)

    expect(result).toHaveLength(1)
    expect(result[0].filename).toBe("blob-test.json")
    expect(result[0].content).toBe('{"x": 1}')
  })

  it("excludes directory entries", async () => {
    const zip = new JSZip()
    zip.file("file.txt", "content")
    zip.folder("empty-dir")
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })

    const result = await parseJatosZip(arrayBuffer)

    expect(result).toHaveLength(1)
    expect(result[0].filename).toBe("file.txt")
  })

  it("returns empty array for empty ZIP", async () => {
    const zip = new JSZip()
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })

    const result = await parseJatosZip(arrayBuffer)

    expect(result).toHaveLength(0)
  })
})
