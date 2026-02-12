declare module "mustache" {
  type View = Record<string, any>

  function render(template: string, view?: View, partials?: Record<string, string>): string

  const Mustache: {
    render: typeof render
  }

  export default Mustache
}
