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

仓库已配置 `package.json` 的 **`homepage`**（当前为 `https://congqinhe.github.io/audittool`），构建产物会带 **`/audittool`** 子路径；路由使用 **`basename`**，与正式环境一致。

1. 安装依赖（含发布工具）：`npm install`
2. 构建（会自动把 `index.html` 复制为 `404.html`，避免刷新子路由 404）：`npm run build`
3. 发布到 `gh-pages` 分支：`npm run deploy:gh-pages`  
4. 在 GitHub 仓库 **Settings → Pages** 中，将 **Source** 设为 **`gh-pages` / `(root)`**。

线上入口示例：

- 管理端：<https://congqinhe.github.io/audittool2/admin>
- 审核页：<https://congqinhe.github.io/audittool2/reviewer>

若仓库名或用户名不同，请修改 `package.json` 里的 **`homepage`** 为 `https://<用户>.github.io/<仓库名>`（不要末尾斜杠）。

**更换为自有域名或其它访问地址**（含 DNS、`CNAME`、子路径与根域名差异）：见 [docs/部署-域名说明.md](docs/部署-域名说明.md)。

## 导入 Figma 继续设计

若希望在 Figma 中继续设计，可使用 **html.to.design** 插件将页面导入 Figma。详细步骤见 [docs/FIGMA_设计导出指南.md](docs/FIGMA_设计导出指南.md)。

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
