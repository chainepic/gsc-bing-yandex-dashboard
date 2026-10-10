# Search Triad 快速开始

[English README](../../README.md) · 自托管三引擎 SEO 看板（Google Search Console、Bing Webmaster、Yandex Webmaster）

## 你会得到什么

- **配置向导**：四步完成，任意引擎可跳过（只接 1～2 个也够用）
- **看板**：总览、站点对照、关键词涨跌、历史日报
- **定时任务**：默认每天 09:00（时区可改）自动同步并生成 Markdown/JSON 日报
- **通知**：Webhook（Slack / Discord / 通用 HTTP）或 SMTP
- **数据在本地**：SQLite + 加密密钥文件，落在 `./data`

## 本地启动

**环境**：Node.js 20+、pnpm 9+

```bash
pnpm install
cp .env.example apps/web/.env
```

编辑 `apps/web/.env`，设置 **`APP_SECRET`**（至少 16 位随机字符串，用于加密 OAuth/API 密钥）。

```bash
pnpm dev
```

浏览器打开 **http://localhost:3847/setup**，按向导操作。

生产式运行：

```bash
pnpm build && pnpm start
```

## Docker 一键

```bash
cp .env.example .env
# 在 .env 里写好 APP_SECRET
docker compose up --build
```

访问 **http://localhost:3847/setup**。数据库与 `secrets.enc.json` 持久化在 **`./data`**。

## 各引擎怎么接

| 引擎 | 凭证 | 要点 |
| --- | --- | --- |
| **Google** | OAuth 客户端（推荐）或服务账号 JSON | 权限 `webmasters.readonly`；回调地址 `http://localhost:3847/api/oauth/google/callback`（部署时换成你的域名）。服务账号需在 GSC 里给每个资源加用户。 |
| **Bing** | Webmaster 后台 API Key | 拉取已验证站点列表。 |
| **Yandex** | OAuth Client ID/Secret + access token | 勾选 `webmaster:hostinfo`、`webmaster:verify`；浏览器授权后，在回调页复制 token 粘贴回向导。 |

不必三个都接；常见组合是 Google + Bing。

## 日报怎么用

1. 定时任务按你在向导里设的时区与时间跑同步。
2. 写入 SQLite 后生成 JSON + Markdown 日报。
3. 若配置了 Webhook/SMTP 会自动推送；所有历史记录在 **Digest** 页可回看。
4. 也可在 Digest 页 **立即生成** 或 **生成并推送**。

## 示例数据（仅 UI 演示）

虚构 **example.com** 数据，不调用真实 API。需先启动应用，并在环境变量中设置 `ALLOW_DEMO_SEED=1`：

```bash
curl -X POST http://localhost:3847/api/demo/seed
```

## 安全提醒

- 保存凭证前务必设置好 `APP_SECRET`。
- 勿将 `data/`、`.env`、真实站点密钥提交到 Git。
- 若公网暴露，请用 VPN 或反向代理 + 访问控制保护面板。

## 更多

- 英文完整说明：[README.md](../../README.md)
- 参与贡献：[CONTRIBUTING.md](../../CONTRIBUTING.md)
