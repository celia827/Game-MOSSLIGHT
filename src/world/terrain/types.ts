export type TerrainKind = 'ground' | 'platform';
export interface Point { x: number; y: number }
/** Art placement only. No physics bodies or engine-specific objects. */
export interface TerrainDefinition {
  id: string;
  /** Optional authored local polyline; old SVG geometry remains the default. */
  profile?: readonly Point[];
  oneWay?: boolean;
  kind: TerrainKind;
  x: number; y: number; width: number; height: number;
}
export interface TerrainCollision {
  id: string;
  top: Point[];
  polygon: Point[];
}
