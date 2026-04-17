// character-shape.js
//
// Authoritative shape reference for the Character data model. Parallels
// `src/data/classes/class-shape.js` and `src/data/gear/gear-shape.js`.
// Pure documentation — exports `CHARACTER_SHAPE` + `SESSION_SHAPE` +
// `CHARACTER_BUILD` constants with field names mapped to type-hint strings.
//
// ── Mental model (OQ-D2 decision) ───────────────────────────────
//
// Character state splits into three tiers:
//
//   1. **Character** — persistent identity + selections. Small,
//      serializable, savable. Holds: characterId, name, religion,
//      className, attribute allocation, persistent ability selections
//      (perks/skills/spells), and a reference to the equipped loadout
//      (by id, not embedded).
//
//   2. **Session** — live, per-interaction state the React UI mutates
//      constantly. Holds: active buffs, class resource counters, stack
//      counts, tier selections, player states, weapon-held-state,
//      hpFraction, target profile, environment overrides, applyToSelf /
//      applyToEnemy selectors, viewingAfterEffect.
//
//   3. **CharacterBuild** — composition contract that wraps all three
//      (character + session + loadout + item instances + item
//      definitions) and is consumed by the normalizer
//      (`src/engine/normalizeBuild.js`, 6.5c.2) to produce an engine
//      Build.
//
// Multi-character persistence is a **flag**, not an implementation: the
// `characterId` field is reserved; a save store / character list is a
// future-phase feature (see user-memory `project_shareable_builds.md`).

import { ARMOR_TYPES, ABILITY_TYPES } from "../constants.js";
import { STAT_META } from "../stat-meta.js";
import { RELIGION_BLESSINGS } from "../religions.js";

export const CHARACTER_SHAPE = {
  // ── Identity ────────────────────────────────────────────────────
  // Stable identifier for persistence. Not yet load-bearing (no save
  // store), but reserved so future multi-character work does not need a
  // schema bump. Any non-empty string is legal; uniqueness is enforced
  // at the save-store layer when one exists, not by this shape.
  characterId: "<string>",

  // Display name. Free-form; validator checks string type + non-empty.
  name: "<string>",

  // Religion id — must match a `RELIGION_BLESSINGS[].id`. Canonical enum
  // imported from src/data/religions.js; "none" means no blessing.
  religion: "<RELIGION_BLESSINGS_ID — 'none'|'noxulon'|'blythar'|'solaris'|'zorin'>",

  // Class id — must match an authored class-data id (validator consults
  // the CLASSES registry when available; until class data finishes
  // migration, any non-empty string is accepted).
  className: "<string — class id, e.g. 'warlock'>",

  // ── Attribute allocation ────────────────────────────────────────
  // Base values per core attribute (pre-gear-sum). Gear inherent/modifier
  // contributions sum in at normalizer time; the engine's `ctx.attributes`
  // is pre-summed per `buildContext.js:48-49`.
  attributes: {
    str: "<number>", vig: "<number>", agi: "<number>",
    dex: "<number>", wil: "<number>", kno: "<number>", res: "<number>",
  },

  // ── Persistent ability selections ──────────────────────────────
  // Ability ids selected for this character. The class-data CLASSES
  // registry is the source of truth for which ids are legal; validator
  // checks membership when the class is known.
  persistentSelections: {
    selectedPerks:   "<string[] — perk ability ids>",
    selectedSkills:  "<string[] — skill ability ids>",
    selectedSpells:  "<string[] — spell ability ids>",
    equippedLoadoutId: "<string | null — reference to a saved loadout; null during initial authoring>",
  },
};

export const SESSION_SHAPE = {
  // ── Live activation state (React-mutated per toggle) ──────────
  activeBuffs:           "<string[] — ability ids currently toggled on>",
  classResourceCounters: "<Record<string, number> — e.g. { soul_shards: 3 }>",
  stackCounts:           "<Record<string, number> — per-ability stack count>",
  selectedTiers:         "<Record<string, string> — per-spell tier id (poor/good/perfect)>",
  playerStates:          "<PLAYER_STATES[] — e.g. ['hiding']>",
  viewingAfterEffect:    "<string[] — ability ids whose after-effect is currently viewed>",

  // ── Weapon held-state (L5, OQ-D7) ─────────────────────────────
  // "unarmed" = bare hands; "slot1" | "slot2" = the held weapon loadout.
  // Normalizer (6.5c.2 path a) uses this to pick which loadout contributes
  // stats; off-loadout dormant per L6.
  weaponHeldState: "<'unarmed' | 'slot1' | 'slot2'>",

  // ── HP fraction (damage projection context) ───────────────────
  hpFraction: "<number — 0.0..1.0>",

  // ── Target profile + environment ──────────────────────────────
  target: {
    pdr:         "<number — decimal (0.40 = 40%)>",
    mdr:         "<number — decimal>",
    headshotDR:  "<number — decimal>",
    maxHealth:   "<number — optional>",
    creatureType:"<'demon' | 'undead' | null — optional>",
    projectileDR:"<number — decimal; optional>",
  },
  environment: "<Record<string, unknown> — environment overrides>",

  // ── Apply-to routing (either-target atoms) ────────────────────
  applyToSelf:  "<Record<string, boolean>>",
  applyToEnemy: "<Record<string, boolean>>",
};

// CHARACTER_BUILD is the input to the normalizer. Consumers construct
// this by combining a Character, a Session, a Loadout, and the backing
// item data. The normalizer flattens it to an engine-compatible Build.
export const CHARACTER_BUILD = {
  character:       "<CHARACTER_SHAPE>",
  session:         "<SESSION_SHAPE>",
  loadout:         "<LOADOUT — from src/data/gear/gear-shape.js>",
  itemInstances:   "<Record<ItemInstanceId, GEAR_ITEM_INSTANCE>>",
  itemDefinitions: "<Record<DefinitionId, GEAR_ITEM_DEFINITION>>",
};

// Registry references (for validators).
export const _CHARACTER_REGISTRIES = {
  ARMOR_TYPES,
  ABILITY_TYPES,
  STAT_META,
  RELIGION_BLESSINGS,
};
