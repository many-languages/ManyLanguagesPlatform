import { describe, it, expect } from "vitest"
import JSZip from "jszip"
import { rewriteJatosStudyUuidInJzip } from "./rewriteJatosStudyUuid"
import { extractJatosStudyUuidFromJzip } from "./extractJatosStudyUuid"

const OLD_UUID = "a1b2c3d4-e5f6-4789-abcd-ef0123456789"
const NEW_UUID = "11111111-2222-4333-8444-555555555555"

async function createJzipWithJas(
  uuid: string,
  jasFilename = "study.jas",
  extraFiles: Record<string, string> = {}
): Promise<File> {
  const zip = new JSZip()
  zip.file(jasFilename, JSON.stringify({ version: 3, data: { uuid, title: "Example" } }))
  for (const [name, content] of Object.entries(extraFiles)) {
    zip.file(name, content)
  }
  const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })
  return new File([arrayBuffer], "study.jzip", { type: "application/zip" })
}

describe("rewriteJatosStudyUuidInJzip", () => {
  it("replaces the UUID in the .jas file", async () => {
    const file = await createJzipWithJas(OLD_UUID)

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const result = await extractJatosStudyUuidFromJzip(rewritten)

    expect(result).toBe(NEW_UUID)
  })

  it("preserves the original filename", async () => {
    const file = await createJzipWithJas(OLD_UUID)

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)

    expect(rewritten.name).toBe(file.name)
  })

  it("leaves other fields in the .jas file untouched", async () => {
    const file = await createJzipWithJas(OLD_UUID)

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const arrayBuffer = await rewritten.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const jasContent = await zip.file("study.jas")!.async("text")
    const parsed = JSON.parse(jasContent)

    expect(parsed.data.title).toBe("Example")
    expect(parsed.version).toBe(3)
  })

  it("leaves non-.jas files untouched", async () => {
    const file = await createJzipWithJas(OLD_UUID, "study.jas", {
      "assets/script.js": "console.log('hello')",
    })

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const arrayBuffer = await rewritten.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const assetContent = await zip.file("assets/script.js")!.async("text")

    expect(assetContent).toBe("console.log('hello')")
  })

  it("updates every .jas file when multiple exist", async () => {
    const zip = new JSZip()
    zip.file("first.jas", JSON.stringify({ data: { uuid: OLD_UUID } }))
    zip.file("second.jas", JSON.stringify({ data: { uuid: "some-other-uuid" } }))
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })
    const file = new File([arrayBuffer], "study.jzip", { type: "application/zip" })

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const rewrittenArrayBuffer = await rewritten.arrayBuffer()
    const rewrittenZip = await JSZip.loadAsync(rewrittenArrayBuffer)
    const first = JSON.parse(await rewrittenZip.file("first.jas")!.async("text"))
    const second = JSON.parse(await rewrittenZip.file("second.jas")!.async("text"))

    expect(first.data.uuid).toBe(NEW_UUID)
    expect(second.data.uuid).toBe(NEW_UUID)
  })

  it("regenerates component UUIDs too, not just the study UUID", async () => {
    const zip = new JSZip()
    const componentUuidA = "3df20243-72e7-4048-9c23-a7a22df8e6de"
    const componentUuidB = "9e28e4fa-b673-4765-a17a-94c5f0a2eb2a"
    zip.file(
      "study.jas",
      JSON.stringify({
        data: {
          uuid: OLD_UUID,
          componentList: [
            { uuid: componentUuidA, title: "Intro" },
            { uuid: componentUuidB, title: "Trial" },
          ],
        },
      })
    )
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })
    const file = new File([arrayBuffer], "study.jzip", { type: "application/zip" })

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const rewrittenArrayBuffer = await rewritten.arrayBuffer()
    const rewrittenZip = await JSZip.loadAsync(rewrittenArrayBuffer)
    const parsed = JSON.parse(await rewrittenZip.file("study.jas")!.async("text"))

    expect(parsed.data.uuid).toBe(NEW_UUID)
    expect(parsed.data.componentList).toHaveLength(2)
    for (const component of parsed.data.componentList) {
      expect(component.uuid).not.toBe(componentUuidA)
      expect(component.uuid).not.toBe(componentUuidB)
      expect(component.uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    }
    expect(parsed.data.componentList[0].title).toBe("Intro")
    expect(parsed.data.componentList[1].title).toBe("Trial")
    // Two components should get two distinct new UUIDs, not the same one
    expect(parsed.data.componentList[0].uuid).not.toBe(parsed.data.componentList[1].uuid)
  })

  it("regenerates batch UUIDs too", async () => {
    const zip = new JSZip()
    const batchUuid = "f1e84cec-10c1-486b-a112-b835f90f64a3"
    zip.file(
      "study.jas",
      JSON.stringify({
        data: {
          uuid: OLD_UUID,
          batchList: [{ uuid: batchUuid, title: "Default" }],
        },
      })
    )
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })
    const file = new File([arrayBuffer], "study.jzip", { type: "application/zip" })

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const rewrittenArrayBuffer = await rewritten.arrayBuffer()
    const rewrittenZip = await JSZip.loadAsync(rewrittenArrayBuffer)
    const parsed = JSON.parse(await rewrittenZip.file("study.jas")!.async("text"))

    expect(parsed.data.batchList[0].uuid).not.toBe(batchUuid)
    expect(parsed.data.batchList[0].title).toBe("Default")
  })

  it("skips malformed .jas entries without throwing", async () => {
    const zip = new JSZip()
    zip.file("bad.jas", "not valid json")
    zip.file("good.jas", JSON.stringify({ data: { uuid: OLD_UUID } }))
    const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })
    const file = new File([arrayBuffer], "study.jzip", { type: "application/zip" })

    const rewritten = await rewriteJatosStudyUuidInJzip(file, NEW_UUID)
    const rewrittenArrayBuffer = await rewritten.arrayBuffer()
    const rewrittenZip = await JSZip.loadAsync(rewrittenArrayBuffer)
    const bad = await rewrittenZip.file("bad.jas")!.async("text")
    const good = JSON.parse(await rewrittenZip.file("good.jas")!.async("text"))

    expect(bad).toBe("not valid json")
    expect(good.data.uuid).toBe(NEW_UUID)
  })
})
