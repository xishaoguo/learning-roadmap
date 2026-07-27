# 暖居租房平台

根据 Figma 原型实现的一体化租房项目，包含：

- `h5`：React + Vite 移动端租房应用
- `admin`：React + Ant Design 管理后台
- `server`：Node.js + Express + PostgreSQL API

## 本地开发

```bash
npm install
cp server/.env.example server/.env
npm run dev:server
npm run dev:h5
npm run dev:admin
```

默认端口：H5 `5173`、后台 `5174`、API `3000`。管理后台默认账号由服务端环境变量 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 决定。

## 构建

```bash
npm run build
```

服务端首次启动会自动创建 `zufang` schema、数据表和演示房源。
