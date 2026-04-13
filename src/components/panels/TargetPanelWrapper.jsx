import { TargetEditor } from '../TargetEditor.jsx';
import { Panel } from '../ui/Panel.jsx';

export function TargetPanelWrapper({ target, patchState }) {
  return (
    <Panel title="Target">
      <TargetEditor target={target} onChange={(t) => patchState({ target: t })} />
    </Panel>
  );
}
