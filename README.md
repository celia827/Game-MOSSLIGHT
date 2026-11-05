# 苔光之森 · MOSSLIGHT

原创 SVG 森林横版冒险游戏，采用 Phaser、TypeScript 和 Vite。

## 运行

```bash
npm ci
npm run dev
```

- `/level01/`：第一章 V1 正式关卡，默认版本。
- `/level01-v2-c11-preview/`：V2 灰盒可玩原型。
- `/level01-v2-c11-preview/?bridge=OPEN`：静态根桥上路。
- `/level01-v2-c11-preview/?bridge=FOLDED`：静态闭桥、地下根室路线。
- `/`：森林与角色演示。
- `/animation-lab/`：角色动画工作台。
- `/art-lab/`：游戏美术工作台。

A/D 或方向键移动，Shift 走路，Space/W/↑ 单跳，E 互动，J 手记，R 完整重置。开发模式提供地图总览和路线回放。

V2 与 V1 独立配置。V2 已有非伤害自动救援及现有机关、露珠、检查点和结算布局；没有攻击、怪物AI、HP伤害、荆棘伤害或实时压力根桥。

## 开发与验证

```bash
npm run typecheck
npm run build
npm run preview
npm test
```

`npm test`需要支持直接运行TypeScript测试的Node版本及本机Chrome。浏览器回归目前还使用项目本地QA CLI缓存；该工具尚未列入package.json，已有工作区可运行，全新安装环境的浏览器测试依赖还需规范。

## 目录

|目录|用途|
|---|---|
|`src/`|游戏逻辑、V1/V2关卡、角色、相机、环境和工作台|
|`public/assets/`|游戏使用的SVG素材|
|`tests/`|游戏自动化回归|
|`scripts/`|美术生成和测试兼容工具|
|`docs/`|测试直接读取的最小数据、源码对照及V2设计基准|

历史验收包、录像、截图、PDF、旧报告、完整工程备份和清理日志已按要求移除。`src/animation-lab/baseline/`由工作台实际使用，属于游戏源码。`docs/`里的少量baseline/snapshot用于回归比较，不是可删除的交付备份。
