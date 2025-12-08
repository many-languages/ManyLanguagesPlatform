/**
 * Scrolls to a component data viewer element
 * @param componentId - The component ID to scroll to
 * @param delay - Delay in milliseconds before scrolling (default: 100)
 */
export function scrollToComponentData(componentId: number, delay: number = 100): void {
  setTimeout(() => {
    const element = document.getElementById(`raw-data-component-${componentId}`)
    element?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
  }, delay)
}
