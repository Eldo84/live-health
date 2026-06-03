import { useT } from "../lib/useT";

// Inline translation helper. Renders its (string) child translated into the
// active app language via the static UI bundles backing useT. Because it's a
// component (not a hook call), it can be used anywhere in JSX — inside .map(),
// conditionals, ternaries — without tripping React's rules-of-hooks.
//
//   <T>Read full story</T>
//
// For translated text that must be a plain string (placeholder, aria-label,
// title attributes), call the useT hook directly at the top of the component
// instead: const tSearch = useT("Search stories…").
export function T({ children }: { children: string }) {
  return <>{useT(children)}</>;
}
