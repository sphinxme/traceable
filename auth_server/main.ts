import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { Liveblocks } from "https://cdn.jsdelivr.net/npm/@liveblocks/node@2.10.2/+esm";
import {
  createPresignedUrl,
  generateKey,
  isS3Configured,
  isValidPath,
} from "./lib/s3.ts";
import type { Context, Next } from "jsr:@hono/hono";

if (!Deno.env.has("LIVEBLOCKS_KEY")) {
    throw new Error("no LIVEBLOCKS_KEY found!");
}

const secret = Deno.env.get("LIVEBLOCKS_KEY")
const liveblocks = new Liveblocks({secret});

// API Key认证中间件
async function authMiddleware(c: Context, next: Next) {
  const apiKey = c.req.header("X-API-Key");
  if (apiKey !== Deno.env.get("API_KEY")) {
    return c.json({ code: 401, message: "Unauthorized" }, 401);
  }
  await next();
}

// 上传URL过期时间（秒）
const UPLOAD_URL_EXPIRES = 3600; // 1小时
// 下载URL过期时间（秒）
const DOWNLOAD_URL_EXPIRES = 900; // 15分钟

const app = new Hono();
app
    .use(cors())
    .all("/auth", async () => {
        const session = liveblocks.prepareSession("sphinx");
        session.allow("*", session.FULL_ACCESS);
        const { status, body } = await session.authorize();
        return new Response(body, { status });
    })
    // 图片上传API - 需要认证
    .post("/pictures/upload", authMiddleware, async (c) => {
        // 检查S3是否配置
        if (!isS3Configured()) {
            return c.json({ code: 500, message: "S3 not configured" }, 500);
        }

        try {
            const body = await c.req.json();
            const filename = body.filename || "file.bin";
            const contentType = body.contentType || "application/octet-stream";

            // 生成对象key
            const key = generateKey(filename);

            // 生成预签名上传URL
            const uploadUrl = await createPresignedUrl(
                "PUT",
                key,
                UPLOAD_URL_EXPIRES,
                { "Content-Type": contentType }
            );

            // 构建访问URL（通过本服务代理）
            const pictureUrl = `${new URL(c.req.url).origin}/pictures/${key}`;

            return c.json({
                code: 0,
                data: {
                    uploadUrl,
                    pictureUrl,
                    key,
                    method: "PUT",
                    headers: { "Content-Type": contentType }
                }
            });
        } catch (error) {
            console.error("[pictures/upload] Error:", error);
            return c.json({ code: 500, message: "Internal server error" }, 500);
        }
    })
    // 图片访问API - 无需认证，重定向到预签名URL
    .get("/pictures/:path{uploads/.+}", async (c) => {
        // 检查S3是否配置
        if (!isS3Configured()) {
            return c.json({ code: 500, message: "S3 not configured" }, 500);
        }

        const path = c.req.param("path");

        // 验证路径有效性
        if (!isValidPath(path)) {
            return c.json({ code: 400, message: "Invalid path" }, 400);
        }

        try {
            // 生成预签名下载URL
            const downloadUrl = await createPresignedUrl(
                "GET",
                path,
                DOWNLOAD_URL_EXPIRES
            );

            // 302重定向
            return c.redirect(downloadUrl, 302);
        } catch (error) {
            console.error("[pictures/:path] Error:", error);
            return c.json({ code: 500, message: "Internal server error" }, 500);
        }
    });

Deno.serve({port:9000}, app.fetch);
