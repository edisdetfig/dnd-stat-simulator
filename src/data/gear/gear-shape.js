// gear-shape.js
//
// Authoritative shape reference for the Gear data model. Parallels
// `src/data/classes/class-shape.js`. Pure documentation — exports a single
// `GEAR_SHAPE` const whose fields are literal names mapped to type-hint
// strings + WHY comments. Runtime behavior lives in the validator files
// (`gear-definition-validator.js`, `gear-instance-validator.js`) and the
// normalizer (`src/engine/normalizeBuild.js`, 6.5c.2).
//
// Source-of-truth discipline. Ranges, pool membership, exclusion rules, and
// stat identity come from `docs/session-prompts/gear-shape-design.md § 4`
// (authoritative per LOCK B). Phase-to-stat assignments come from
// `docs/gear-wiki-facts.md § 2` (VERIFIED / WIKI-SOURCED citations per
// LOCK D). Nothing in this file re-authors those facts; it references them.
//
// ── Mental model ─────────────────────────────────────────────────────
//
// A Character equips a Loadout. A Loadout has 11 slots (2 weapon loadouts
// each {primary, secondary} + 9 armor/accessory). Each slot holds an
// Item Instance (or is empty). An Item Instance references an Item
// Definition by id.
//
// Item Definition (authored per item, build-time):
//   - Static identity + enum-membership fields (slotType, armorType, …).
//   - Inherent numeric stats (fixed or ranged).
//   - Inherent weapon-properties (per-stage combo arrays, impact zones,
//     swing timing) — distinct structural shape; inherent-only per L4.
//   - On-hit effects (per-hit riders on weapon-primary-hits).
//   - Metadata (rarity availability, craftable flag, class restrictions).
//
// Item Instance (user-selected, runtime):
//   - Chosen rarity (one of the definition's `availableRarities`).
//   - Rolled inherents (for inherents authored as `{min, max}` ranges —
//     user picks a value in range).
//   - Modifiers: N = modCount per rarity+craftable rule + overrides.
//     Each modifier has: stat, value, unit, source ∈ {natural, socketed}.
//     Source discriminates which range (natural vs socketed) the value is
//     validated against.
//
// The engine never sees the rich shape. The normalizer (6.5c.2) flattens
// held loadout → engine `Build.gear = { weapon, offhand?, bonuses,
// onHitEffects }`, dropping off-loadout per L6.

import { STAT_META } from "../stat-meta.js";
import { MODIFIER_POOLS, MODIFIER_POOL_STAT_ALIASES } from "./modifier-pools.js";
import { EXCLUSION_GROUPS, NEVER_SOCKETABLE_STATS } from "./exclusion-groups.js";

export const GEAR_SHAPE = {
  // ── LOADOUT envelope (§4.1) ─────────────────────────────────────
  //
  // 11 top-level slot keys. Weapon slots hold {primary, secondary}
  // envelopes; all other slots hold an Item Instance directly or null.
  // `secondary` is always null if `primary.handType === "twoHanded"`.

  LOADOUT: {
    id: "<string>",                    // loadout identifier (stable across edits)
    slots: {
      weaponSlot1: "<WEAPON_LOADOUT_SLOT>",
      weaponSlot2: "<WEAPON_LOADOUT_SLOT>",
      head:     "<ITEM_INSTANCE | null>",
      chest:    "<ITEM_INSTANCE | null>",
      back:     "<ITEM_INSTANCE | null>",
      hands:    "<ITEM_INSTANCE | null>",
      legs:     "<ITEM_INSTANCE | null>",
      feet:     "<ITEM_INSTANCE | null>",
      ring1:    "<ITEM_INSTANCE | null>",
      ring2:    "<ITEM_INSTANCE | null>",
      necklace: "<ITEM_INSTANCE | null>",
    },
  },

  WEAPON_LOADOUT_SLOT: {
    primary:   "<ITEM_INSTANCE | null>",  // slotType: primaryWeapon
    secondary: "<ITEM_INSTANCE | null>",  // slotType: secondaryWeapon; must be null if primary.handType==="twoHanded"
  },

  // ── GEAR_ITEM_DEFINITION (§4.4) ────────────────────────────────
  //
  // Per-item authored file. Immutable: rolls + user choices live on the
  // Item Instance (OQ-D5 decision — definition + instance-overlay).

  GEAR_ITEM_DEFINITION: {
    id:   "<string — stable identifier>",
    name: "<string — display name>",

    // ── Taxonomy (§4.1, §4.4, L2) ──
    slotType:        "<SLOT_TYPES — 'primaryWeapon'|'secondaryWeapon'|'head'|'chest'|'back'|'hands'|'legs'|'feet'|'ring'|'necklace'>",
    armorType:       "<ARMOR_TYPES | null — 'cloth'|'leather'|'plate'; null for weapons/jewelry>",
    weaponType:      "<WEAPON_TYPES | WEAPON_TYPES[] | null — string or array per L2.1>",
    handType:        "<HAND_TYPES | null — 'oneHanded'|'twoHanded'; null for non-weapons>",

    // ── Class gating (L9, L10) ──
    // Empty list = no class restriction (armor-proficiency-gated only per L10 path 2).
    // Jewelry is always class-agnostic per L9 (enforced by character-gear-validator
    // as a separate rule).
    requiredClasses: "<string[] — class ids, empty=no restriction>",

    // ── Rarity system (L1, L12, OQ-D11) ──
    // `availableRarities` is the list of rarities this item can be rolled at.
    // `modifierCountOverrides` overrides the default modCount per rarity.
    // `craftable: true` adds +1 to default modCount per rarity (wiki §9.4).
    // Explicit `modifierCountOverrides` wins over craftable rule.
    // `unique` rarity: modCount=1 at 3× naturalRange (L1).
    availableRarities:       "<RARITY_ORDER[] — e.g. ['rare','epic']>",
    modifierCountOverrides:  "<Record<rarity, number> — e.g. {rare:3}>",
    craftable:               "<boolean | undefined — +1 modifier per rarity when true>",

    // ── Inherent stats (L3, L11) ──
    // Two forms allowed per entry:
    //   fixed:   { stat, value, unit }
    //   ranged:  { stat, min, max, unit }     (user picks value at instance time)
    // `inherentsByRarity` overrides `inherentStats` when the inherent set
    // differs per rarity (e.g., weapons that scale base damage across
    // rarities I–VII per gear-wiki-facts.md § 10).
    inherentStats:      "<INHERENT_STAT_ATOM[] — see below>",
    inherentsByRarity:  "<Record<rarity, INHERENT_STAT_ATOM[]> | undefined>",

    // ── Inherent weapon/shield properties (L4) ──
    // Structural (non-numeric) fields. Only authored on weapon + shield
    // items. Not in STAT_META numeric aggregation — the normalizer writes
    // these into ctx as structured data for projectDamage to consume.
    // See INHERENT_WEAPON_PROPERTIES for the sub-shape.
    inherentWeaponProperties: "<INHERENT_WEAPON_PROPERTIES | undefined>",

    // ── Per-item exclusion overrides (§4.6) ──
    // Stat ids that, despite being inherent or group-blocked by default,
    // are re-allowed for socketing on this specific item. Rare — only
    // used when a specific item breaks the general rule.
    socketExclusionOverrides: "<string[] — stat ids>",

    // ── On-hit effects (§4.4, OQ-D6) ──
    // Per-hit riders applied to weapon-primary-hit damage projections.
    // Spiked Gauntlet is the anchor case: +1 True Physical Damage on every
    // melee hit, included in the main damage number (not a separate
    // projection) per docs/damage_formulas.md:235-240.
    onHitEffects: "<ON_HIT_EFFECT_ATOM[]>",
  },

  INHERENT_STAT_ATOM: {
    stat: "<STAT_META key — e.g. 'weaponDamage', 'moveSpeed'>",

    // Fixed form: authored `value`. Ranged form: authored `min` + `max`
    // (user picks in [min, max] at instance time per L13). Exactly one
    // form per entry.
    value: "<number | undefined>",
    min:   "<number | undefined>",
    max:   "<number | undefined>",

    // Unit is stat-determined per L11; validator enforces match against
    // STAT_META[stat].unit. Authored on each entry for legibility.
    unit:  "<'flat' | 'percent'>",
  },

  // Inherent weapon/shield properties — structural, not numeric. Authored
  // per weapon definition; separate from `inherentStats[]` because the
  // shape isn't a simple stat+value. Numeric STAT_META entries exist for
  // label/unit lookup (see stat-meta.js `comboMultiplier / impactZone /
  // swingTiming / impactPower / impactResistance`) — they do NOT
  // participate in aggregate bonuses.
  //
  // Source: docs/gear-wiki-facts.md § 2.5, § 3, § 4.
  INHERENT_WEAPON_PROPERTIES: {
    // Per-combo-stage damage multipliers (e.g., Spectral Blade primary
    // 100/105/110%, special 135/135%). Values stored as percent (100=100%).
    combos: "<COMBO_BLOCK[] | undefined>",

    // Per-strike-zone multipliers (wiki "100%/90%" pair — exact zone
    // mapping UNRESOLVED per gear-wiki-facts.md § 3.2).
    impactZones: "<number[] | undefined>",

    // Weapon/shield impact mechanics (gear-wiki-facts.md § 3.4).
    impactPower:      "<number | undefined>",  // on attacker side
    impactResistance: "<number | undefined>",  // on defender/shield side

    // Per-stage timing metadata — display only (does not feed
    // action-speed math per gear-wiki-facts.md § 3.3; swings are scaled
    // by final AS as `displayedLength = base / (1 + AS)`).
    swingTiming: "<SWING_TIMING_STAGE[] | undefined>",
  },

  COMBO_BLOCK: {
    label:      "<'primary' | 'special' | 'riposte' | string>",
    stages:     "<COMBO_STAGE[]>",
  },

  COMBO_STAGE: {
    stage:      "<number — 1-indexed stage number>",
    multiplier: "<number — percent (100 = 100%)>",
    damageType: "<'slash' | 'pierce' | 'blunt' | string>",
  },

  SWING_TIMING_STAGE: {
    stage:    "<number>",
    windup:   "<number — seconds>",
    hit:      "<number — seconds>",
    recovery: "<number — seconds>",
  },

  // ── ON_HIT_EFFECT_ATOM (OQ-D6) ─────────────────────────────────
  //
  // Spiked Gauntlet pattern: `{ damage: 1, damageType: "physical",
  // trueDamage: true, scaling: 1.0, separateInstance: false }`.
  //
  // separateInstance semantics (OQ-D6):
  //   false → rider sums into main damage number (post-floor true-physical
  //           additive per docs/damage_formulas.md:155-159); no separate
  //           projection. This is Spiked Gauntlet's behavior.
  //   true  → rider projects as a separate DAMAGE atom. Not implemented in
  //           6.5c.2; reserved for future items.
  //
  // scaling is the Attribute Bonus Ratio per gear-wiki-facts.md § 11.2 —
  // a numeric 0–1 multiplier on the caster's PPB/MPB contribution to the
  // rider's damage. For Spiked Gauntlet, exact value UNRESOLVED (assumed
  // 1.0 pending in-game testing per § 11.2).

  ON_HIT_EFFECT_ATOM: {
    damage:           "<number — base flat per-hit amount>",
    damageType:       "<DAMAGE_TYPES — 'physical' | 'magical' | '<type>_magical'>",
    trueDamage:       "<boolean — skip target DR when true>",
    scaling:          "<number | null — Attribute Bonus Ratio, 0-1>",
    separateInstance: "<boolean — false=in-main-number, true=separate DAMAGE atom (future)>",
    notes:            "<string | undefined — authoring note (non-semantic)>",
  },

  // ── GEAR_ITEM_INSTANCE (OQ-D5) ────────────────────────────────
  //
  // User-selected state layered over a definition. Produced by the sim
  // (user picks rarity + modifiers) or by import. Validated by
  // gear-instance-validator.

  GEAR_ITEM_INSTANCE: {
    definitionId: "<string — lookup into the item-definition registry>",

    // Must be ∈ definition.availableRarities.
    rarity: "<RARITY_ORDER — 'poor'|'common'|…|'unique'>",

    // Populated when the definition authors any inherent with {min, max}.
    // Keyed by stat id; value is the user's pick in [min, max].
    rolledInherents: "<Record<statId, number> | undefined>",

    // N entries where N = resolved modCount for this rarity (see OQ-D11):
    //   modCount = definition.modifierCountOverrides[rarity]
    //              ?? (RARITY_CONFIG[rarity].modCount + (definition.craftable ? 1 : 0))
    //   unique:    N = 1, value rolls in 3× naturalRange (L1)
    // Each modifier:
    //   { stat, value, unit, source }
    //   source: "natural" | "socketed" — determines which range (and
    //     thereby which max) the value is validated against (OQ-D1).
    modifiers: "<GEAR_MODIFIER_ATOM[]>",
  },

  GEAR_MODIFIER_ATOM: {
    stat:   "<stat id — must be ∈ resolvePoolKey(def.slotType, def.handType) pool, with alias resolution>",
    value:  "<number — in applicable range per source>",
    unit:   "<'flat' | 'percent'>",
    source: "<'natural' | 'socketed'>",
  },

  // ── MATERIALIZATION_ORDER (OQ-D8 spec) ─────────────────────────
  //
  // Canonical algorithm for resolving an Item Instance → usable stat
  // totals. Enforced by gear-instance-validator (step-by-step rule
  // coverage) and executed by the normalizer (6.5c.2):
  //
  //   1. Load definition by `instance.definitionId`.
  //   2. Select rarity; must be ∈ definition.availableRarities.
  //   3. Materialize inherents:
  //      - If definition.inherentsByRarity[rarity] exists, use it.
  //      - Else use definition.inherentStats.
  //      - For ranged inherents, read `instance.rolledInherents[stat]`;
  //        must be ∈ [min, max]. Fixed inherents pass through.
  //   4. Compute available modifier pool:
  //      a. Start with MODIFIER_POOLS[resolvePoolKey(slotType, handType)].
  //      b. Subtract inherent-blocked stats (generalRule
  //         `inherent_blocks_self`): for each inherent whose stat ∈ pool,
  //         remove that pool entry — unless stat ∈
  //         definition.socketExclusionOverrides.
  //      c. Apply exclusion-group blocking: for each EXCLUSION_GROUPS
  //         entry, if any member is inherent AND member ===
  //         group.dominantBlocker, remove ALL group members from pool.
  //         If a non-dominant member is inherent, remove only the other
  //         group members (group itself is "partially consumed" — the
  //         inherent counts; no further socketing of members allowed).
  //      d. NEVER_SOCKETABLE_STATS are removed from any pool (safety net
  //         — §4.5 pools already exclude them, but overrides cannot
  //         re-add them).
  //   5. Instance chooses modCount modifiers:
  //      - Each modifier.stat must be ∈ available pool.
  //      - No duplicate stats across instance.modifiers[].
  //      - Each source ∈ {natural, socketed}; value ∈ applicable range.
  //   6. Cross-validate:
  //      - Count group-member occurrences across (inherent ∪ modifiers)
  //        per EXCLUSION_GROUPS. Must be ≤ 1 per group.
  MATERIALIZATION_ORDER: "<see comment block above>",

  // ── Registry references (imported from sibling files) ──────────
  _REGISTRIES: {
    STAT_META:                  STAT_META,
    MODIFIER_POOLS:             MODIFIER_POOLS,
    MODIFIER_POOL_STAT_ALIASES: MODIFIER_POOL_STAT_ALIASES,
    EXCLUSION_GROUPS:           EXCLUSION_GROUPS,
    NEVER_SOCKETABLE_STATS:     NEVER_SOCKETABLE_STATS,
  },
};
