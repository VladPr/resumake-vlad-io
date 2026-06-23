// LaTeX special characters must be escaped or they break compilation
// (e.g. an unescaped `&` -> "Misplaced alignment tab character"). User input
// from the form/JSON import is interpolated raw into the .tex document, so we
// escape every string value before generating the template.

const LATEX_ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}'
}

// Single pass over the original string, so the braces we introduce (e.g. in
// `\textbackslash{}`) are never re-escaped.
export function escapeLatex(value: string): string {
  return value.replace(/[\\&%$#_{}~^]/g, (ch) => LATEX_ESCAPES[ch])
}

// Recursively escape every string in the form data. Numbers, booleans and the
// control fields (`sections`, `selectedTemplate`) contain no special characters
// so they pass through unchanged.
export function sanitize<T>(value: T): T {
  if (typeof value === 'string') {
    return escapeLatex(value) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      out[key] = sanitize(val)
    }
    return out as T
  }
  return value
}
