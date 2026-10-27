# 认证服务

基于 Bun + Hono 的轻量服务（默认端口 9000），为前端提供 Liveblocks 认证和图片上传支持。

> 依赖均为 npm 包（`hono`、`@liveblocks/node`、`aws4fetch`），Bun 运行时自动读取 `.env`，无需手动指定 env-file。

## 文件

| 文件 | 说明 |
|------|------|
| `src/main.ts` | 服务入口（Hono 路由） |
| `src/lib/s3.ts` | S3 预签名 URL 生成（七牛云对象存储） |
| `package.json` | 依赖声明（npm 包） |
| `tsconfig.json` | TypeScript 配置 |
| `.env.example` | 环境变量模板 |
| `API.md` | 图片上传/访问 API 文档 |
| `Dockerfile` | Docker 部署配置（构建上下文为本目录，可独立构建分发） |

## API

### Liveblocks 认证

```
POST /auth
```

为前端签发 Liveblocks 会话。前端通过 `VITE_LIVEBLOCKS_AUTH_ENDPOINT` 环境变量指向此端点。

### 图片上传

```
POST /pictures/upload
Header: X-API-Key: <api_key>
Body: { filename, contentType }
```

返回 S3 预签名上传 URL，前端直传七牛云，不经服务端中转。上传 URL 有效期 1 小时。

### 图片访问

```
GET /pictures/uploads/{year}/{month}/{uuid}.{ext}
```

302 重定向到 S3 预签名下载 URL，无需认证。下载 URL 有效期 15 分钟。

## 环境变量

| 变量 | 说明 |
|------|------|
| `LIVEBLOCKS_KEY` | Liveblocks 密钥（必需） |
| `API_KEY` | 图片上传 API 认证密钥 |
| `QINIU_ACCESS_KEY` | 七牛云 Access Key |
| `QINIU_SECRET_KEY` | 七牛云 Secret Key |
| `QINIU_BUCKET_NAME` | 存储空间名 |
| `QINIU_REGION` | 区域（默认 `cn-east-1`） |
| `PORT` | 监听端口（默认 `9000`） |

## 启动

```bash
# 本地开发（bun 自动读取 .env，模板见 .env.example；--watch 热重载）
bun run dev

# 生产
bun run start
```

或使用 Docker（在仓库根目录执行，构建上下文仅本目录，与其他 app 完全隔离）：

```bash
docker build -t traceable-auth ./apps/auth-server
docker run -p 9000:9000 -e LIVEBLOCKS_KEY=xxx traceable-auth
```

详细 API 文档见 [API.md](API.md)。
