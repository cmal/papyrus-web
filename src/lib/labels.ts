/**
 * Defensive normalization for an artifact's `labels` field.
 *
 * Papyrus persists labels as a JSON column, but the write path is not uniformly
 * validated: `tasks.create` in @danypops/papyrus's modules/tasks.ts narrows the
 * input with a bare `input.labels as string[]` type assertion (no runtime check),
 * unlike `tasks.update`, which uses the runtime-validating `optionalStringArray`.
 * A caller that sends a comma-joined string therefore gets it persisted as a
 * JSON *string* (`"a,b,c"`) instead of a JSON *array* (`["a","b","c"]`).
 *
 * The daemon reads that column with a plain `JSON.parse`, so the API can hand
 * back a `string` where every consumer (and the TypeScript type) says `string[]`.
 * `"a,b,c".slice(0, 2).map(...)` throws `TypeError: ... .map is not a function` —
 * which is what took down the Tasks page.
 *
 * Normalizing here keeps malformed legacy rows rendering as their obviously
 * intended labels instead of crashing, and never throws on unexpected input.
 */
export function normalizeLabels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  }

  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (trimmed.length === 0) return [];

  // A JSON-encoded array stored inside a string column (double encoding).
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizeLabels(parsed);
    } catch {
      // Fall through to comma splitting.
    }
  }

  // A comma-joined label list, e.g. "fix,ui,ULPB-1341".
  return trimmed
    .split(",")
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
}
