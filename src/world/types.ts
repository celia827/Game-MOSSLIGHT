import type { ArtPlacement } from '../art/composition';
import type { LayerId } from './layers';
import type { TerrainDefinition } from './terrain/types';

export interface MapDefinition {
  id: string;
  title: string;
  layers: Record<LayerId,readonly ArtPlacement[]>;
  terrain: readonly TerrainDefinition[];
  character: { terrainId: string; footX: number; scale: number };
}
