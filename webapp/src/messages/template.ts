export type Template = { id: string; name: string; body: string };

export function fillTemplate(template: Template, values: Record<string, string>): { body: string; error?: string } {
  const keys = [...template.body.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] ?? "");
  const missing = keys.filter((key) => !values[key]?.trim());
  if (missing.length > 0) return { body: template.body, error: `Missing ${[...new Set(missing)].join(", ")}.` };
  return { body: template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "") };
}
