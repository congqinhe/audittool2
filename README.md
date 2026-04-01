# 智能审核系统 - 前端原型

中国区销售合同智能评审系统的交互原型，包含审核复核页与管理端界面。

## 快速开始

```bash
npm install
npm start
```

访问 [http://localhost:3000](http://localhost:3000)，默认进入管理端首页。

| 页面 | 地址 |
|------|------|
| 管理端首页 | http://localhost:3000/admin |
| 规则管理 | http://localhost:3000/admin/rules |
| 审核复核页 | http://localhost:3000/reviewer |

## GitHub Pages 访问

仓库已配置 `package.json` 的 **`homepage`**（当前为 `https://congqinhe.github.io/audittool2`），构建产物会带 **`/audittool`** 子路径；路由使用 **`basename`**，与正式环境一致。

1. 安装依赖（含发布工具）：`npm install`
2. 构建（会自动把 `index.html` 复制为 `404.html`，避免刷新子路由 404）：`npm run build`
3. 发布到 `gh-pages` 分支：`npm run deploy:gh-pages`  
4. 在 GitHub 仓库 **Settings → Pages** 中，将 **Source** 设为 **`gh-pages` / `(root)`**。

线上入口示例：

- 管理端：<https://congqinhe.github.io/audittool2/admin>
- 审核页：<https://congqinhe.github.io/audittool2/reviewer>




