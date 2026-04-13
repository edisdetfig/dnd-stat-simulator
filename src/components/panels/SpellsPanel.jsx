import { Panel } from '../ui/Panel.jsx';
import { AbilityRow } from './AbilityRow.jsx';

export function SpellsPanel({ classData, selected, toggle, availableSpells, selectedStacks, setStacks }) {
  const availableIds = new Set(availableSpells.map(s => s.id));
  return (
    <Panel title={`Spells (${selected.length})`}>
      {classData.spells.map(spell => {
        const isInMemory = selected.includes(spell.id);
        const isGranted = !isInMemory && availableIds.has(spell.id);
        return (
          <AbilityRow key={spell.id}
            ability={spell}
            selected={isInMemory}
            grantedLabel={isGranted ? "granted" : null}
            onToggle={() => toggle(spell.id)}
            stacks={selectedStacks[spell.id] ?? 0}
            setStacks={spell.stacking ? (n) => setStacks(spell.id, n) : null}
          />
        );
      })}
    </Panel>
  );
}
