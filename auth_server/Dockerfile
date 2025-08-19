FROM denoland/deno:latest

# TODO:增加LABEL TAG

# 设置工作目录
WORKDIR /app

# 1. 复制代码
COPY . /app

# 2. 缓存依赖（关键优化！减少冷启动）
RUN deno install --entrypoint main.ts

# 3. 设置运行时环境变量（支持注入密钥）运行时可通过 -e LIVEBLOCKS_KEY=xxx覆盖
ENV LIVEBLOCKS_KEY ""

# 4. 运行应用（允许网络访问）
CMD ["deno", "run", "--allow-net", "main.ts"]
