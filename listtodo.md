# Search Triad — 功能 backlog

> **定位：** 自托管「三引擎监测」面板（Google Search Console + Bing Webmaster + Yandex Webmaster）+ **针对性优化建议**。  
> 数据来自官方 Webmaster API，落本地 SQLite；digest / 站内推荐帮你决定改什么页、查什么词。  
> **不是** OpenSEO / Ahrefs / 关键词研究 SaaS 的替代品；OpenSEO 不作为产品主干。
>
> **双线并行（OSS ∥ Cloud，互不阻塞）：** [docs/DUAL-TRACK.md](docs/DUAL-TRACK.md)  
> 周任务请写在 [docs/backlog/oss.md](docs/backlog/oss.md) / [docs/backlog/cloud.md](docs/backlog/cloud.md)，本文件偏产品能力清单。

版本基线：**v0.2.x**（已可用的监测面板）。下文只列向前做的事。

---

## 已完成（v0.2.x，简述）

- [x] Setup 四步向导：连引擎、选站点（property select）、跳过任意引擎
- [x] 面板 Basic Auth / `APP_SECRET` 加密密钥；Docker Compose 入口校验
- [x] GSC OAuth / 服务账号、Bing API Key、Yandex OAuth（含 refresh token）
- [x] 同步 ~28 天日指标 + query/page movers；Settings 展示 sync 错误明细
- [x] Overview / Sites / Site detail（引擎 Tab）/ Keywords（筛选）
- [x] CTR 展示（Overview 等）；站点级 query & page movers
- [x] Daily digest（Markdown/JSON）+ webhook + SMTP
- [x] Guide / First-run / 部分 empty states
- [x] 演示种子数据 + README 截图脚本

---

## P0 — 高优先级（核心体验 / 三引擎深度）

### 三引擎对等与深度

- [x] **URL 检查（只读）**：GSC URL Inspection；Bing / Yandex 在 API 允许范围内对齐（索引状态、最后爬取、覆盖问题摘要）
- [x] **Sitemap 只读列表**：各引擎已提交 sitemap 的状态 / 错误摘要（不做提交、不做管理写入）
- [x] **覆盖 / 索引缺口对照**：同 host 在 GSC vs Bing vs Yandex 的「有流量 / 无数据 / 明显掉量」对照表
- [x] **Movers / CTR 加强**：page movers 展示 CTR、impressions、position；支持「曝光↑点击↓」「点击骤降」预设筛选
- [x] **跨引擎 movers 统一视图**：同一 query/page 在三引擎并排 Δ（缺数据标空白，不强行对齐）

### 针对性优化建议（规则引擎优先）

- [x] **规则引擎 v1**（本地、可解释）：基于 movers、CTR 异常、impressions↑ clicks↓、页面掉量、单引擎缺口生成建议卡片
- [x] **建议写入 digest**：每日 Markdown 增加「本周建议」小节（可开关）
- [x] **站内 Recommendations 区**：Overview 或独立页；每条带证据（指标 + 引擎 + 链接到 site/keyword）
- [x] **引擎特化提示**：例如仅 Bing 掉、仅 Yandex 无数据、GSC 覆盖报错但另两家仍有点击

### UX（剩余项）

- [x] Sync / URL 检查失败时的可操作 empty / error 态（重试、去 Settings、去 Guide）
- [x] Keywords / Sites 增加时间窗与「异常预设」快捷滤镜（与规则引擎共用定义）

---

## P1 — 中优先级（增强建议质量 + 轻量本地审计）

### 建议与可操作输出

- [x] **建议优先级打分**：严重度 × 流量规模 × 是否跨引擎；支持 snooze / 已处理
- [x] ~~可选本地 LLM 润色建议卡片~~ → **已弃用**；改用 Export → Report AI（BYOK）
- [x] **导出**：建议列表 CSV / 追加进 webhook payload

### 轻量内容 / 技术提示（自家 URL，支撑「针对性优化」）

- [x] **轻量爬取自家 URL**（用户勾选 host/path）：title、meta description、H1、canonical、status code、robots meta
- [x] **与 Search 数据对照**：掉量 page → 拉当前 on-page 快照；标题过长/缺 H1/软 404 等出提示
- [x] **范围克制**：单站并发与 URL 上限可配；不做全站百万页爬虫、不做外链库、不做竞品抓取

### Bing / Yandex 增量

- [x] **Bing URL 提交（可选）**：单独开关 + 二次确认；默认关闭；日志可审计
- [x] **Yandex SQI / 索引相关字段**（API 允许时）：host 摘要卡展示；纳入建议证据
- [x] **各引擎 API 能力矩阵**文档：哪些只读、哪些可选写入、哪些引擎没有对等能力

---

## P2 — 低优先级（打磨 / 以后再说）

- [x] 更长历史窗口（>28d）与简单趋势对比 UI
- [x] Digest 模板自定义（章节开关、语言）
- [x] 多 property 批量 URL 检查队列（仍只读为主）
- [x] 站点备注 / 关注列表（watchlist 持久化增强）
- [x] i18n（中/英 UI 字符串） — MVP: nav + key titles via Settings `uiLocale` (en/zh); deeper string coverage later
- [x] 更细的 Guide：URL 检查、建议规则说明、本地爬取安全边界

### 已落地（分享 / AI）

- [x] **选择性导出**（JSON / CSV / Markdown）+ 出站 inventory
- [x] **Report AI（BYOK）**：用户自备 API Key + 预设提示词解读导出切片（非建议卡片润色）
- [x] 单人面板；不与他人共享登录 — 分享靠导出

---

## 明确不做 / Out of scope（v1–v1.x）

| 不做 | 原因 |
| --- | --- |
| OpenSEO / 关键词 SaaS 集成 | 定位冲突；完全不考虑 |
| 多租户 / SaaS 托管版（进 MIT） | 保持单用户自托管；托管属 Cloud |
| 多人登录同一面板 | 分享用导出即可 |
| GA4 / Yandex Metrica 作为 v1 核心 | 分析产品线另论；本产品专注 Search Webmaster |
| / 竞品外链 / 全网爬虫 SaaS | 不做第二个 Ahrefs/SEMrush |
| Sitemap **提交**、批量索引「刷量」自动化 | 只读优先；Bing URL 提交仅可选+确认 |
| 云端强制 LLM / 把密钥送到第三方 SEO API | 默认规则；可选 BYOK 报告解读；计量属 Cloud |

---

## 建议实现顺序（Phases）

1. **Phase A — 数据深度**  
   Movers/CTR/异常筛选 → 跨引擎缺口对照 → Sitemap 只读 → URL 检查（GSC 先，再 Bing/Yandex）

2. **Phase B — 建议闭环**  
   规则引擎 v1 → 站内 Recommendations → digest「本周建议」→ snooze / 导出

3. **Phase C — 可执行提示**  
   轻量自家 URL 审计 → 与掉量页对照 →（可选）Export / Report AI

4. **Phase D — 引擎特化与写入边界**  
   Yandex SQI/索引字段 → Bing URL 提交（确认流）→ API 能力矩阵文档

5. **Phase E — 打磨**  
   更长历史、digest 模板、i18n、Guide 补全；选择性导出与 BYOK 报告解读

---

## 使用方式

按 Priority → Phase 勾选实现；每完成一项把 `- [ ]` 改成 `- [x]`，并在 PR / release note 里写清「监测」还是「建议」增量。  
新需求先问：是否服务 **三引擎监测** 或 **针对性优化**？否则默认进「不做」或「以后再说」。
