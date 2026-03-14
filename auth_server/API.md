# 图片上传/访问 API 文档

## 概述

本服务提供基于预签名URL的图片上传和访问API，支持前端直传图片到S3兼容存储（七牛云），避免文件经过服务器中转。

**基础URL**: `http://localhost:9000`

---

## 认证

上传API需要通过 `X-API-Key` Header 进行认证：

```
X-API-Key: <your_api_key>
```

图片访问API无需认证，公开可访问。

---

## API 接口

### 1. 获取上传预签名URL

获取用于直传S3的预签名URL。

**请求**

```
POST /pictures/upload
```

**Headers**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| X-API-Key | string | 是 | API认证密钥 |
| Content-Type | string | 是 | 固定值: `application/json` |

**Body**

```json
{
  "filename": "photo.jpg",
  "contentType": "image/jpeg"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| filename | string | 否 | 原始文件名，用于生成存储路径和提取扩展名，默认 `file.bin` |
| contentType | string | 否 | 文件MIME类型，默认 `application/octet-stream` |

**响应**

成功响应 (200):

```json
{
  "code": 0,
  "data": {
    "uploadUrl": "https://s3.cn-east-1.qiniucs.com/traceable/uploads/2026/03/uuid.jpg?X-Amz-Algorithm=...",
    "pictureUrl": "http://localhost:9000/pictures/uploads/2026/03/uuid.jpg",
    "key": "uploads/2026/03/uuid.jpg",
    "method": "PUT",
    "headers": {
      "Content-Type": "image/jpeg"
    }
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| uploadUrl | string | S3预签名上传URL，有效期1小时 |
| pictureUrl | string | 图片访问URL，通过本服务代理访问 |
| key | string | S3对象存储路径 |
| method | string | 上传HTTP方法，固定为 `PUT` |
| headers | object | 上传时需要携带的Headers |

失败响应 (401):

```json
{
  "code": 401,
  "message": "Unauthorized"
}
```

---

### 2. 访问图片

通过图片路径访问已上传的图片，返回302重定向到S3预签名下载URL。

**请求**

```
GET /pictures/uploads/{year}/{month}/{uuid}.{ext}
```

**说明**

- 无需认证，公开访问
- 返回302重定向，Location header指向S3预签名URL
- 预签名下载URL有效期15分钟

**响应**

```
HTTP/1.1 302 Found
Location: https://s3.cn-east-1.qiniucs.com/traceable/uploads/2026/03/uuid.jpg?X-Amz-Algorithm=...
```

失败响应 (400):

```json
{
  "code": 400,
  "message": "Invalid path"
}
```

---

## 使用示例

### 完整上传流程

```typescript
// 1. 获取预签名URL
const response = await fetch('http://localhost:9000/pictures/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    filename: 'photo.jpg',
    contentType: 'image/jpeg'
  })
});

const { data } = await response.json();

// 2. 直传文件到S3
await fetch(data.uploadUrl, {
  method: data.method,
  headers: data.headers,
  body: fileBlob  // File 或 Blob 对象
});

// 3. 使用 pictureUrl 访问图片
console.log('图片地址:', data.pictureUrl);
```



---

## 启动服务

```bash
deno run --allow-net --allow-env --allow-read --env-file=.env main.ts
```
