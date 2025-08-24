# FE Observability & Plugin Platform
可扩展小型平台：
- **浏览器 SDK**：采集 LCP/FID/CLS、资源与接口时延、错误、用户行为，并支持插件化扩展。
- **核心插件内核**：统一生命周期（`setup`/`onEvent`/`teardown`），支持异步、条件路由与采样。
- **可视化看板（React + Vite）**：实时 WebSocket 流式展示、离线数据回放、告警阈值配置。
- **轻量服务端（Fastify）**：聚合/存储（内存版/可换接入 Redis/ClickHouse），推送实时流。
- **CLI**：一键脚手架生成插件模板。
- **工程化**：Monorepo（pnpm）、TypeScript、严格类型、Lint/Typecheck 脚本。

> 目标是体现**架构能力与可扩展性**，而不是堆叠页面功能。

## 快速开始
```bash
pnpm i
pnpm dev
# 打开 http://localhost:5173，SDK 已在页面中自动注入并采集数据
```

## 目录结构
```
apps/
  dashboard/        # React + Vite 实时看板
packages/
  core/             # 插件内核
  sdk/              # 浏览器采集 SDK（内置若干插件示例）
  cli/              # 生成插件模板的命令行
server/             # Fastify + WS 的聚合服务
```

## 扩展点
- 新增浏览器端插件：`pnpm feobs plugin <name>` 或参考 `packages/sdk/src/plugins`。
- 在服务端增加聚合策略：`server/src/pipeline.ts` 中接入自定义 reducer/采样。
- 在看板里增加新图表：`apps/dashboard/src/widgets/*` 注册并订阅 WS 主题。

## 生产化落地建议
- SDK：`navigator.sendBeacon` + 重试队列，压采样/灰度开关；离线缓存 + 批量上报。
- 服务端：Kafka/Redis Stream → ClickHouse/TSDB；Prometheus 告警。
- 看板：权限/多租户/告警收敛；与 A/B 实验、Feature Flag 打通。

## 页面展示 

<img width="1695" height="600" alt="image" src="https://github.com/user-attachments/assets/dc4acdda-a5f2-4781-82e7-7f2af80d2706" />

发送数据 
<img width="1245" height="131" alt="image" src="https://github.com/user-attachments/assets/2722dc37-97d4-4060-b6ea-95a1e52049bf" />

数据接收
<img width="1737" height="634" alt="image" src="https://github.com/user-attachments/assets/506d9b0d-48cc-4433-820b-daceff1ab09b" />


