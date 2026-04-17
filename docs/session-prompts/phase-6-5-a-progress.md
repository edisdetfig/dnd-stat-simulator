# Phase 6.5a — Progress

Tracker for the Stage 4 execution pass. Updated during research; one row per OQ-W.

**Plan signed off:** 2026-04-17 by user (corrections: STAT_META inventory; OQ-W8 unique-rarity framing; R3 dedicated callout; STAT_META-outside-registry appendix).

**Output doc:** `docs/gear-wiki-facts.md` — written 2026-04-17.

## Status legend

- ⏳ pending
- 🔄 in progress
- ✅ complete
- ⚠️ partial / blocked

## OQ-W checklist

| OQ-W | Topic | Status | Started | Completed | Dominant level | Notes |
|---|---|---|---|---|---|---|
| OQ-W1 | Per-stat phase/curve table | ✅ | 2026-04-17 | 2026-04-17 | VERIFIED (majority) + WIKI-SOURCED (creature-type, impact stats) | ~50 stat rows. Creature-type bonuses wiki-only (not yet in VERIFIED formula). |
| OQ-W2 | Weapon property math | ⚠️ | 2026-04-17 | 2026-04-17 | WIKI-SOURCED | Per-weapon impactPower values missing from wiki; impactZone zone-mapping unresolved. |
| OQ-W3 | Hit combo semantics | ⚠️ | 2026-04-17 | 2026-04-17 | VERIFIED (Spectral Blade) + WIKI-SOURCED (Arming Sword, Longsword); PARTIAL (other weapon categories not sampled) | Data shape confirmed; full enumeration is Phase 11+ authoring. |
| OQ-W4 | Memory capacity interactions | ✅ | 2026-04-17 | 2026-04-17 | VERIFIED | Formula matches VERIFIED repo + WIKI. |
| OQ-W5 | Secondary weapon variants | ✅ | 2026-04-17 | 2026-04-17 | WIKI-SOURCED | Sword/dagger/axe/shield variants enumerated; Pavise primary-2H-shield anomaly confirmed. |
| OQ-W6 | "magicStuff" vocabulary | ✅ | 2026-04-17 | 2026-04-17 | WIKI-SOURCED | Wiki names it "Magic Stuff"; 10 members listed; multi-typed Crystal Sword confirmed. |
| OQ-W7 | Never-socketable stats | ⚠️ | 2026-04-17 | 2026-04-17 | WIKI-SOURCED | No formal wiki list; derived by absence from enchantments table. |
| OQ-W8 | Rarity + modifier count | ⚠️ | 2026-04-17 | 2026-04-17 | L12 (VERIFIED) + wiki delta on Unique row | Wiki says Unique=5; L12 wins per coordinator confirmation. Craftable +1 rule documented. |
| OQ-W9 | Inherent ranged stats | ✅ | 2026-04-17 | 2026-04-17 | WIKI-SOURCED | Three patterns identified: scalar, per-rarity progression, per-rarity range. |
| OQ-W10 | On-hit effects | ✅ | 2026-04-17 | 2026-04-17 | VERIFIED (Spiked Gauntlet math) + WIKI-SOURCED (attributeBonusRatio mechanism) | Only Spiked Gauntlet is a true proc-style on-hit rider in sampled gear. |
| OQ-W11 | Class / armor grants | ⚠️ | 2026-04-17 | 2026-04-17 | WIKI-SOURCED | Warlock + Fighter audited; 8 other classes deferred to Phase 10. |
| OQ-W12 | Class gating (jewelry/weapons) | ✅ | 2026-04-17 | 2026-04-17 | WIKI-SOURCED | Jewelry: no gating confirmed. Weapons: all sampled have class lists. |
| OQ-W13 | naturalRangeVerified audit | ✅ | 2026-04-17 | 2026-04-17 | WIKI-SOURCED | Exact match on most pools; 2 discrepancies flagged (addMemCap 2H, healing Add 2H). |

## Wiki pages fetched (total 23)

- `/Main_Page` — site structure discovery.
- `/Stats` — stat inventory + per-attribute curve overview.
- `/Damage` — damage formula layers + hit-location.
- `/Weapons` — weapon categories, main/off-hand, combo column structure.
- `/Enchantments` — rarity-mod-count table, socketed-vs-natural, exclusion families, full per-slot pool.
- `/Scaling` — Attribute Bonus Ratio mechanic.
- `/Impact_Power` — impact power/resistance mechanics + formulas.
- `/Movement` — move speed formula, cap.
- `/Health` — health formula confirmation.
- `/Luck` — Luck mechanic, cap, sources.
- `/Spectral_Blade` — per-weapon combo/timing data.
- `/Arming_Sword` — per-weapon data.
- `/Longsword` — per-weapon data, riposte.
- `/Accessories` — jewelry (no class gating), Necklace of Peace.
- `/Warlock` — Demon Armor, class grants.
- `/Fighter` — Slayer, Defense Mastery, Weapon Mastery.
- `/Spiked_Gauntlet` — on-hit +1 true physical, class restrictions.
- `/Spellbook` — Magic Stuff category, class list, magic-damage scaling.
- `/Crystal_Sword` — multi-typed weapon (Sword + Magic Stuff).
- `/Pavise` — primary-2H-shield anomaly.
- `/Statuses` — duration-bonus interaction confirmation.
- `/Armors` — armor slot categories + named on-hit items (Spiked Gauntlet, Mitre, Regal Mitre).
- `/Patch_Notes` — wiki version caveat (Patch 6.10 Hotfix 113, 2026-04-16).

## Completion stats

- **Total OQ-Ws answered:** 13 / 13 (6 ANSWERED, 7 PARTIAL — all with UNRESOLVED hand-off items).
- **Facts captured:** ~140 (50+ stat rows + 90+ other facts across sections).
- **Persistent UNRESOLVED items:** 17 (see `docs/gear-wiki-facts.md § 15`).
- **Wiki-pages fetched:** 23.
- **Files created:** `docs/gear-wiki-facts.md`, `docs/session-prompts/phase-6-5-a-progress.md`.
- **Files modified:** 0.
- **Code changes:** 0.
