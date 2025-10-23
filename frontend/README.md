# EasyBet Frontend

基于 Vue 3 + TypeScript + Vite 构建的去中心化彩票系统前端应用。

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 快速的前端构建工具
- **Vue Router** - Vue.js 官方路由管理器
- **Pinia** - Vue 的状态管理库
- **Ethers.js** - 以太坊 JavaScript 库
- **Axios** - HTTP 客户端

## 项目结构

```text
frontend/
├── public/                 # 静态资源
├── src/
│   ├── components/         # 可复用组件
│   ├── views/             # 页面组件
│   │   ├── Home.vue       # 首页
│   │   ├── Activities.vue # 竞猜活动页面
│   │   ├── MyTickets.vue  # 我的彩票页面
│   │   └── Admin.vue      # 管理后台页面
│   ├── router/            # 路由配置
│   ├── stores/            # 状态管理
│   │   └── contract.ts    # 合约交互状态
│   ├── App.vue            # 根组件
│   ├── main.ts            # 应用入口
│   └── style.css          # 全局样式
├── index.html             # HTML 模板
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # TypeScript 配置
└── package.json           # 项目依赖
```

## 可用脚本

在项目目录中，你可以运行：

### `npm run dev`

启动开发服务器。\
在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

页面会在你编辑时自动重新加载。\
你也会在控制台中看到任何 lint 错误。

### `npm run build`

构建生产版本的应用。\
构建的文件会被正确地打包并优化以获得最佳性能。

构建会被压缩，文件名包含哈希值。\
你的应用已经准备好部署了！

### `npm run preview`

预览生产构建的本地服务器。

## 功能特性

- 🎯 **竞猜活动管理** - 创建和管理各种竞猜项目
- 🎫 **彩票购买** - 购买彩票并获得 ERC721 凭证
- 🔄 **自由交易** - 在结果公布前自由买卖彩票
- 🔒 **去中心化** - 基于区块链的透明交易
- 👨‍💼 **管理后台** - 公证人功能，创建活动和结算
- 📱 **响应式设计** - 适配各种设备尺寸

## 开发指南

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 与智能合约集成

前端通过 `stores/contract.ts` 中的 Pinia store 与智能合约交互：

- 钱包连接和账户管理
- 合约方法调用
- 交易状态跟踪
- 错误处理

## 了解更多

- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Vue Router 文档](https://router.vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Ethers.js 文档](https://docs.ethers.org/)