import { Panel } from '../ui/Panel.jsx';
import { AbilityRow } from './AbilityRow.jsx';

export function SkillsPanel({ classData, selected, toggle, selectedStacks, setStacks }) {
  return (
    <Panel title={`Skills (${selected.length}/${classData.maxSkills})`}>
      {classData.skills.map(skill => (
        <AbilityRow key={skill.id}
          ability={skill}
          selected={selected.includes(skill.id)}
          onToggle={() => toggle(skill.id)}
          stacks={selectedStacks[skill.id] ?? 0}
          setStacks={skill.stacking ? (n) => setStacks(skill.id, n) : null}
        />
      ))}
    </Panel>
  );
}
