// character-shape-validator.js — validates a Character object against
// CHARACTER_SHAPE. Runtime-callable; the sibling Vitest file drives happy
// + negative fixtures.
//
// Public API:
//   validateCharacter(character) -> ValidationError[]
//
// Rule code prefix: CH.*

import { CORE_ATTRS } from "../constants.js";
import { RELIGION_BLESSINGS } from "../religions.js";

const CHARACTER_REQUIRED = [
  "characterId", "name", "religion", "className",
  "attributes", "persistentSelections",
];

const PERSISTENT_REQUIRED = [
  "selectedPerks", "selectedSkills", "selectedSpells", "equippedLoadoutId",
];

const RELIGION_IDS = new Set(RELIGION_BLESSINGS.map(r => r.id));

export function validateCharacter(character) {
  const errors = [];
  const id = character?.characterId ?? "<unknown>";

  if (!character || typeof character !== "object") {
    errors.push(errAt(id, "", "character is not an object", "CH.required"));
    return errors;
  }

  for (const key of CHARACTER_REQUIRED) {
    if (character[key] === undefined) {
      errors.push(errAt(id, key, `missing required field "${key}"`, "CH.required"));
    }
  }

  // Identity
  if (character.characterId !== undefined && typeof character.characterId !== "string") {
    errors.push(errAt(id, "characterId", "must be a string", "CH.characterId"));
  }
  if (character.name !== undefined && (typeof character.name !== "string" || character.name.length === 0)) {
    errors.push(errAt(id, "name", "must be a non-empty string", "CH.name"));
  }
  if (character.className !== undefined && (typeof character.className !== "string" || character.className.length === 0)) {
    errors.push(errAt(id, "className", "must be a non-empty string", "CH.className"));
  }

  // Religion
  if (character.religion !== undefined && !RELIGION_IDS.has(character.religion)) {
    errors.push(errAt(id, "religion",
      `unknown religion "${character.religion}" (must be in RELIGION_BLESSINGS)`,
      "CH.religion"));
  }

  // Attributes — all 7 core attrs must be numbers
  if (character.attributes && typeof character.attributes === "object") {
    for (const attr of CORE_ATTRS) {
      const v = character.attributes[attr];
      if (typeof v !== "number" || Number.isNaN(v)) {
        errors.push(errAt(id, `attributes.${attr}`, "must be a number", "CH.attributes"));
      } else if (v < 0) {
        errors.push(errAt(id, `attributes.${attr}`, "must be non-negative", "CH.attributeValueRange"));
      }
    }
    // Unknown attribute keys
    for (const key of Object.keys(character.attributes)) {
      if (!CORE_ATTRS.has(key)) {
        errors.push(errAt(id, `attributes.${key}`, `unknown attribute "${key}"`, "CH.attributes"));
      }
    }
  } else if (character.attributes !== undefined) {
    errors.push(errAt(id, "attributes", "must be an object", "CH.attributes"));
  }

  // Persistent selections
  const ps = character.persistentSelections;
  if (ps && typeof ps === "object") {
    for (const key of PERSISTENT_REQUIRED) {
      if (ps[key] === undefined) {
        errors.push(errAt(id, `persistentSelections.${key}`, `missing required field "${key}"`, "CH.required"));
      }
    }
    for (const listKey of ["selectedPerks", "selectedSkills", "selectedSpells"]) {
      const v = ps[listKey];
      if (v !== undefined) {
        if (!Array.isArray(v)) {
          errors.push(errAt(id, `persistentSelections.${listKey}`, "must be an array", `CH.${listKey}`));
        } else {
          v.forEach((entry, i) => {
            if (typeof entry !== "string" || entry.length === 0) {
              errors.push(errAt(id, `persistentSelections.${listKey}[${i}]`,
                "must be a non-empty string", `CH.${listKey}`));
            }
          });
        }
      }
    }
    if (ps.equippedLoadoutId !== undefined && ps.equippedLoadoutId !== null
        && typeof ps.equippedLoadoutId !== "string") {
      errors.push(errAt(id, "persistentSelections.equippedLoadoutId",
        "must be a string or null", "CH.equippedLoadoutId"));
    }
  } else if (ps !== undefined) {
    errors.push(errAt(id, "persistentSelections", "must be an object", "CH.required"));
  }

  return errors;
}

function errAt(characterId, path, message, rule) {
  return { characterId, path, message, rule };
}
