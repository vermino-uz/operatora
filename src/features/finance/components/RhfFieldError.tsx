/** Plain-text field error for non-`TextField` inputs (`NumberField`,
 * `Select`) where HeroUI's own `<FieldError>` slot isn't guaranteed to pick
 * up React Hook Form's `fieldState.error` outside a `TextField`'s own
 * field context. */
export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
