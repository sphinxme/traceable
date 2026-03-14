import { AwsClient } from "jsr:@mhart/aws4fetch";

// 环境变量验证
const QINIU_ACCESS_KEY = Deno.env.get("QINIU_ACCESS_KEY");
const QINIU_SECRET_KEY = Deno.env.get("QINIU_SECRET_KEY");
const QINIU_BUCKET_NAME = Deno.env.get("QINIU_BUCKET_NAME");
const QINIU_REGION = Deno.env.get("QINIU_REGION") || "cn-east-1";

// 启动时验证必要的环境变量
if (!QINIU_ACCESS_KEY || !QINIU_SECRET_KEY || !QINIU_BUCKET_NAME) {
  console.warn(
    "[S3] Missing required environment variables: QINIU_ACCESS_KEY, QINIU_SECRET_KEY, or QINIU_BUCKET_NAME"
  );
}

// 创建S3客户端单例
const client = QINIU_ACCESS_KEY && QINIU_SECRET_KEY
  ? new AwsClient({
      accessKeyId: QINIU_ACCESS_KEY,
      secretAccessKey: QINIU_SECRET_KEY,
      region: QINIU_REGION,
      service: "s3",
    })
  : null;

const BUCKET = QINIU_BUCKET_NAME || "";
const REGION = QINIU_REGION;
const ENDPOINT = `https://s3.${REGION}.qiniucs.com`;

/**
 * 检查S3客户端是否已配置
 */
export function isS3Configured(): boolean {
  return client !== null && BUCKET !== "";
}

/**
 * 生成预签名URL
 * @param method HTTP方法
 * @param key 对象key
 * @param expiresIn 过期时间（秒）
 * @param headers 额外的headers
 */
export async function createPresignedUrl(
  method: "GET" | "PUT",
  key: string,
  expiresIn: number,
  headers: Record<string, string> = {},
): Promise<string> {
  if (!client) {
    throw new Error("S3 client not configured. Missing environment variables.");
  }

  const url = new URL(`${ENDPOINT}/${BUCKET}/${key}`);
  // 先设置过期时间
  url.searchParams.set("X-Amz-Expires", expiresIn.toString());

  // 使用 signQuery: true 签名查询字符串
  const signed = await client.sign(url.toString(), {
    method,
    headers,
    aws: { signQuery: true }
  });

  return signed.url;
}

/**
 * 生成对象Key: uploads/{year}/{month}/{uuid}.{ext}
 * @param filename 原始文件名
 */
export function generateKey(filename: string): string {
  const now = new Date();
  const ext = filename.split(".").pop() || "bin";
  return `uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
}

/**
 * 验证path是否有效（防止目录遍历攻击）
 * @param path 要验证的路径
 */
export function isValidPath(path: string): boolean {
  // 不能包含 ..
  if (path.includes("..")) {
    return false;
  }
  // 不能是绝对路径
  if (path.startsWith("/")) {
    return false;
  }
  // 必须是 uploads/ 开头
  if (!path.startsWith("uploads/")) {
    return false;
  }
  return true;
}

/**
 * 获取bucket名称
 */
export function getBucket(): string {
  return BUCKET;
}

/**
 * 获取region
 */
export function getRegion(): string {
  return REGION;
}

/**
 * 获取endpoint
 */
export function getEndpoint(): string {
  return ENDPOINT;
}
