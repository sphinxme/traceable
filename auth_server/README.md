# 认证服务

基于 Deno + Hono 的轻量服务（端口 9000），为前端提供 Liveblocks 认证和图片上传支持。

## 文件

| 文件 | 说明 |
|------|------|
| `main.ts` | 服务入口（Hono 路由） |
| `lib/s3.ts` | S3 预签名 URL 生成（七牛云对象存储） |
| `API.md` | 图片上传/访问 API 文档 |
| `Dockerfile` | Docker 部署配置 |

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

## 启动

```bash
deno run --allow-net --allow-env --allow-read --env-file=.env main.ts
```

或使用 Docker：

```bash
docker build -t traceable-auth .
docker run -p 9000:9000 -e LIVEBLOCKS_KEY=xxx traceable-auth
```

详细 API 文档见 [API.md](API.md)。
