// Yields effects from the active transformation (form) — if any.
//
// Warlock has no transformations (Blood Pact is modeled as skill-with-toggle,
// not a form). This collector is minimal for Phase 1. Druid exercises it
// in Phase 1.5.
//
// When a form is active, its ability-level condition ({ type: "form_active",
// form: id }) is already implicit — the collector only yields when
// ctx.activeForm matches, so the condition check is redundant. Effects with
// their OWN effect-level conditions are yielded regardless; the pipeline
// filters those via passesConditions.

export function collectTransformationEffects(ctx) {
  const out = [];
  const forms = ctx.classData?.transformations ?? [];
  if (!ctx.activeForm) return out;
  for (const form of forms) {
    if (form.id !== ctx.activeForm) continue;
    if (!Array.isArray(form.effects)) continue;
    for (const effect of form.effects) {
      out.push({ source: "transformation", ability: form, effect });
    }
  }
  return out;
}
