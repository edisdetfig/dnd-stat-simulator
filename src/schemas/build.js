// Zod schemas for shareable build URLs.
// Validates untrusted data decoded from URL fragments before applying to state.
// Schema version (v: 1) enables future migration of old links.

import { z } from 'zod';

const StatModSchema = z.object({
  stat: z.string(),
  value: z.number(),
});

const OnHitEffectSchema = z.object({
  damage: z.number().optional(),
  damageType: z.string().optional(),
  trueDamage: z.boolean().optional(),
});

const GearItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  rarity: z.enum(["poor", "common", "uncommon", "rare", "epic", "legendary", "unique"]),
  inherentStats: z.array(StatModSchema).default([]),
  modifiers: z.array(StatModSchema).default([]),
  // Weapon-specific fields
  handType: z.enum(["oneHanded", "twoHanded"]).optional(),
  weaponDamage: z.number().optional(),
  magicalDamage: z.number().optional(),
  magicWeaponDamage: z.number().optional(),
  onHitEffects: z.array(OnHitEffectSchema).optional(),
}).nullable();

const WeaponSlotSchema = z.object({
  primary: GearItemSchema,
  secondary: GearItemSchema,
}).nullable();

const GearSchema = z.object({
  weaponSlot1: WeaponSlotSchema,
  weaponSlot2: WeaponSlotSchema,
  head: GearItemSchema,
  chest: GearItemSchema,
  back: GearItemSchema,
  hands: GearItemSchema,
  legs: GearItemSchema,
  feet: GearItemSchema,
  ring1: GearItemSchema,
  ring2: GearItemSchema,
  necklace: GearItemSchema,
});

const TargetSchema = z.object({
  pdr: z.number().finite().min(-5).max(5),
  mdr: z.number().finite().min(-5).max(5),
  headshotDR: z.number().finite().min(-5).max(5),
});

export const BuildSchemaV1 = z.object({
  v: z.literal(1),
  class: z.string(),
  weapon: z.string(),
  religion: z.string().default("none"),
  perks: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  spells: z.array(z.string()).default([]),
  buffs: z.array(z.string()).default([]),
  transformations: z.array(z.string()).default([]),
  activeForm: z.string().nullable().default(null),
  target: TargetSchema,
  gear: GearSchema,
  theme: z.string().optional(),
});
