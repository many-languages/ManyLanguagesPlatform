declare module "mustache" {
  export function render(template: string, view?: unknown, partials?: unknown): string

  const Mustache: {
    render: typeof render
  }

  export default Mustache
}
