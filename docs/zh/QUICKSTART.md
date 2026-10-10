# GSC · Bing · Yandex 自托管看板

[English README](../../README.md) · 仓库：[gsc-bing-yandex-dashboard](https://github.com/chainepic/gsc-bing-yandex-dashboard)

## 产品界面

README 内嵌真实截图（example.com 演示数据）：

- [Overview](../../docs/screenshots/overview.png)
- [Sites](../../docs/screenshots/sites.png)
- [Keywords](../../docs/screenshots/keywords.png)
- [Digest](../../docs/screenshots/digest.png)

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
| **Google Search Console** | OAuth 或服务账号；回调 `/api/oauth/google/callback` |
| **Bing Webmaster** | API Key |
| **Yandex Webmaster** | OAuth，`webmaster:hostinfo` + `webmaster:verify` |

## 演示数据

```bash
ALLOW_DEMO_SEED=1 curl -X POST http://localhost:3847/api/demo/seed
```

## 安全

勿提交 `data/`、`.env` 与真实密钥。
