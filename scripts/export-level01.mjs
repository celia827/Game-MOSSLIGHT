import {writeFile} from 'node:fs/promises';
import {Level01MapData} from '../src/levels/level01/Level01MapData.ts';
import {overviewSvg} from '../src/levels/shared/MapOverview.ts';
await writeFile(new URL('../docs/LEVEL01_OVERVIEW.svg',import.meta.url),overviewSvg(Level01MapData));
console.log('Exported docs/LEVEL01_OVERVIEW.svg from the runtime map data.');
