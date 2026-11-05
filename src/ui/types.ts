import type { LayerId } from '../world/layers';
import type { TerrainDefinition } from '../world/terrain/types';
import type { AnimationControls } from '../characters/fox/types';

export interface PreviewControls {
  animation: AnimationControls;
  setDebug: (enabled: boolean) => void;
  setLayerVisible: (id: LayerId,visible: boolean) => void;
  setTerrainPartVisible: (part: 'surface'|'side',visible: boolean) => void;
  updatePlatform: (patch: Partial<Pick<TerrainDefinition,'x'|'y'|'width'|'height'>>) => TerrainDefinition;
  resetPlatform: () => TerrainDefinition;
  platform: TerrainDefinition;
}
