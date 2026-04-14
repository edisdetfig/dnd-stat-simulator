// Minimal valid class for engine tests. Not a real game class — just the
// shape the engine needs. Keeps tests cheap and independent of real Warlock
// data so engine changes don't force test churn on the class.

export function makeMockClass(overrides = {}) {
  return {
    id: "mock",
    name: "Mock",
    baseStats: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 },
    perks: [],
    skills: [],
    spells: [],
    ...overrides,
  };
}
