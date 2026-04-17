// character-gear-validator.js — validates (character × session × loadout)
// consistency at runtime. Enforces L9 (jewelry no gating), L10 (wearable
// check: requiredClasses + armorProficiency + grants/removes), §4.1 (2H
// precludes secondary), L5/L6 (weaponHeldState).
//
// Public API:
//   validateCharacterGear(ctx) -> ValidationError[]
//
// ctx shape:
//   { character, session, loadout, itemInstances, itemDefinitions, classData? }
//
// Rule code prefix: CG.*

const VALID_HELD_STATES = new Set(["unarmed", "slot1", "slot2"]);

const SLOT_KEY_TO_SLOT_TYPE = Object.freeze({
  head:     "head",
  chest:    "chest",
  back:     "back",
  hands:    "hands",
  legs:     "legs",
  feet:     "feet",
  ring1:    "ring",
  ring2:    "ring",
  necklace: "necklace",
});

export function validateCharacterGear(ctx) {
  const errors = [];
  if (!ctx || typeof ctx !== "object") {
    errors.push(errAt("", "ctx is not an object", "CG.required"));
    return errors;
  }

  const { character, session, loadout, itemInstances, itemDefinitions, classData } = ctx;

  // ── Session validity ──────────────────────────────────────
  if (session) {
    if (!VALID_HELD_STATES.has(session.weaponHeldState)) {
      errors.push(errAt("session.weaponHeldState",
        `weaponHeldState must be one of unarmed/slot1/slot2 (was ${JSON.stringify(session.weaponHeldState)})`,
        "CG.weaponHeldStateValid"));
    }
  }

  // ── Loadout reference ────────────────────────────────────
  if (character?.persistentSelections?.equippedLoadoutId
      && loadout?.id
      && character.persistentSelections.equippedLoadoutId !== loadout.id) {
    errors.push(errAt("character.persistentSelections.equippedLoadoutId",
      `equippedLoadoutId "${character.persistentSelections.equippedLoadoutId}" does not match loadout.id "${loadout.id}"`,
      "CG.loadoutRef"));
  }

  if (!loadout || !loadout.slots) return errors;

  const effectiveArmor = computeEffectiveArmorProficiency(character, classData);
  const charClass = character?.className;

  // ── Walk each slot ──────────────────────────────────────
  for (const slotKey of Object.keys(loadout.slots)) {
    const slotVal = loadout.slots[slotKey];
    if (slotKey === "weaponSlot1" || slotKey === "weaponSlot2") {
      const envelope = slotVal ?? {};
      const primary   = envelope.primary   ?? null;
      const secondary = envelope.secondary ?? null;
      if (primary)   validateEquippedItem(errors, slotKey, "primary",   primary,   "primaryWeapon",   itemDefinitions, charClass, effectiveArmor);
      if (secondary) validateEquippedItem(errors, slotKey, "secondary", secondary, "secondaryWeapon", itemDefinitions, charClass, effectiveArmor);

      // 2H precludes secondary
      if (primary && secondary) {
        const primaryDef = itemDefinitions?.[primary.definitionId];
        if (primaryDef?.handType === "twoHanded") {
          errors.push(errAt(`loadout.slots.${slotKey}.secondary`,
            "primary is twoHanded; secondary must be null",
            "CG.twoHandedExclusiveSecondary"));
        }
      }
    } else {
      if (slotVal) {
        const expectedSlotType = SLOT_KEY_TO_SLOT_TYPE[slotKey];
        validateEquippedItem(errors, slotKey, null, slotVal, expectedSlotType, itemDefinitions, charClass, effectiveArmor);
      }
    }
  }

  return errors;
}

// ── Helpers ─────────────────────────────────────────────────

function validateEquippedItem(errors, slotKey, sub, instance, expectedSlotType, itemDefinitions, charClass, effectiveArmor) {
  const path = sub ? `loadout.slots.${slotKey}.${sub}` : `loadout.slots.${slotKey}`;
  const def = itemDefinitions?.[instance.definitionId];
  if (!def) {
    errors.push(errAt(`${path}.definitionId`,
      `definition "${instance.definitionId}" not found in itemDefinitions`,
      "CG.definitionMissing"));
    return;
  }
  if (def.slotType !== expectedSlotType) {
    errors.push(errAt(`${path}`,
      `item.slotType "${def.slotType}" does not match expected "${expectedSlotType}" for slot "${slotKey}${sub ? "." + sub : ""}"`,
      "CG.slotCompatibility"));
  }

  // L10 — requiredClasses gate
  if (Array.isArray(def.requiredClasses) && def.requiredClasses.length > 0) {
    if (charClass && !def.requiredClasses.includes(charClass)) {
      // Even if outside requiredClasses, a blanket class-level grant for the
      // armor type may still apply (L10 path 1 caveat). Accept if effective
      // armor set includes the item's armorType.
      const granted = def.armorType && effectiveArmor && effectiveArmor.has(def.armorType);
      if (!granted) {
        errors.push(errAt(`${path}`,
          `character class "${charClass}" not in requiredClasses [${def.requiredClasses.join(", ")}] and no armor grant bridges it`,
          "CG.requiredClasses"));
      }
    }
  } else if (def.armorType && effectiveArmor) {
    // L10 path 2 — armor-proficiency gate
    if (!effectiveArmor.has(def.armorType)) {
      errors.push(errAt(`${path}`,
        `armorType "${def.armorType}" not in effective proficiency [${[...effectiveArmor].join(", ")}]`,
        "CG.armorProficiency"));
    }
  }
}

/**
 * Effective armor proficiency = class.armorProficiency
 *   ∪ (grants[].type === "armor" from selectedPerks + active abilities)
 *   − (removes[].type === "armor" from selectedPerks + active abilities)
 *
 * Returns null if classData is not provided (caller should skip armor checks).
 * Simplified for 6.5c.1: grant/remove conditions are NOT evaluated — any
 * authored grant/remove on a selected perk is applied. A full implementation
 * evaluates conditions at runtime and lives in 6.5c.2 normalizer + runtime
 * fixpoint.
 */
export function computeEffectiveArmorProficiency(character, classData) {
  if (!classData || !classData.armorProficiency) return null;
  const result = new Set(classData.armorProficiency);
  const selectedPerks = new Set(character?.persistentSelections?.selectedPerks ?? []);
  const abilities = Array.isArray(classData.abilities) ? classData.abilities : [];
  for (const ab of abilities) {
    if (!selectedPerks.has(ab.id)) continue;
    if (Array.isArray(ab.grants)) {
      for (const g of ab.grants) {
        if (g?.type === "armor" && typeof g.armorType === "string") result.add(g.armorType);
      }
    }
    if (Array.isArray(ab.removes)) {
      for (const r of ab.removes) {
        if (r?.type === "armor" && typeof r.armorType === "string") result.delete(r.armorType);
      }
    }
  }
  return result;
}

function errAt(path, message, rule) {
  return { path, message, rule };
}
