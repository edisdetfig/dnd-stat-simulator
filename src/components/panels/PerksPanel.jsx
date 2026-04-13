import { Panel } from '../ui/Panel.jsx';
import { AbilityRow } from './AbilityRow.jsx';

export function PerksPanel({ classData, selected, toggle, selectedStacks, setStacks }) {
  return (
    <Panel title={`Perks (${selected.length}/${classData.maxPerks})`}>
      {classData.perks.map(perk => (
        <AbilityRow key={perk.id}
          ability={perk}
          selected={selected.includes(perk.id)}
          onToggle={() => toggle(perk.id)}
          stacks={selectedStacks[perk.id] ?? 0}
          setStacks={perk.stacking ? (n) => setStacks(perk.id, n) : null}
        />
      ))}
    </Panel>
  );
}
