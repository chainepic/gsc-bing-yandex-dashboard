# GSC · Bing · Yandex 自托管看板

[English README](../../README.md) · 仓库：[gsc-bing-yandex-dashboard](https://github.com/chainepic/gsc-bing-yandex-dashboard)

## 产品界面

README 内嵌截图均为 **example.com 假数据**（站点/关键词已打码），中英文各一份：

| 页面 | 英文 | 中文 |
| --- | --- | --- |
| 总览 | [overview](../../docs/screenshots/overview.png) | [overview-zh](../../docs/screenshots/overview-zh.png) |
| 站点 | [sites](../../docs/screenshots/sites.png) | [sites-zh](../../docs/screenshots/sites-zh.png) |
| 站点详情 | [site-detail](../../docs/screenshots/site-detail.png) | [site-detail-zh](../../docs/screenshots/site-detail-zh.png) |
| 关键词 | [keywords](../../docs/screenshots/keywords.png) | [keywords-zh](../../docs/screenshots/keywords-zh.png) |
| 日报 | [digest](../../docs/screenshots/digest.png) | [digest-zh](../../docs/screenshots/digest-zh.png) |
| 设置 | [settings](../../docs/screenshots/settings.png) | [settings-zh](../../docs/screenshots/settings-zh.png) |
| 指南 | [guide](../../docs/screenshots/guide.png) | [guide-zh](../../docs/screenshots/guide-zh.png) |
| 安装向导 | [setup](../../docs/screenshots/setup.png) | [setup-zh](../../docs/screenshots/setup-zh.png) |
| 首次引导 | [first-run](../../docs/screenshots/first-run.png) | [first-run-zh](../../docs/screenshots/first-run-zh.png) |
| 建议 | [recommendations](../../docs/screenshots/recommendations.png) | [recommendations-zh](../../docs/screenshots/recommendations-zh.png) |

重新生成：`BASE_URL=http://127.0.0.1:3848 pnpm screenshots`（需 `ALLOW_DEMO_SEED=1` 的独立演示库，勿指向含真实站点的 trial 数据）。

## 本地启动

```bash
git clone https://github.com/chainepic/gsc-bing-yandex-dashboard.git
cd gsc-bing-yandex-dashboard
pnpm install
cp .env.example apps/web/.env
# 设置 APP_SECRET（≥16 位）
pnpm dev
```

打开 **http://localhost:3847/setup**。

## Docker

```bash
cp .env.example .env
APP_SECRET=$(openssl rand -hex 32) PANEL_PASSWORD='你的面板密码' docker compose up --build
```

健康检查（无需登录）：`GET /api/health`。公网部署请设置 `PANEL_PASSWORD` 或反向代理 Basic Auth。

## 三引擎凭证

| 引擎 | 说明 |
| --- | --- |
| **Google Search Console** | **推荐 OAuth**（个人自用）；服务账号为进阶且需给每个资源单独加用户。回调 `/api/oauth/google/callback` |
| **Bing Webmaster** | API Key |
| **Yandex Webmaster** | OAuth，`webmaster:hostinfo` + `webmaster:verify` |

## 演示数据

```bash
ALLOW_DEMO_SEED=1 curl -X POST http://localhost:3847/api/demo/seed
```

## 安全

勿提交 `data/`、`.env` 与真实密钥。
