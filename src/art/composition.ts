import type { AssetKey } from './manifest';

export interface ArtPlacement {
  key: AssetKey; x: number; y: number; scale?: number;
  alpha?: number; flipX?: boolean;
}
