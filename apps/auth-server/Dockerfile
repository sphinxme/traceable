FROM oven/bun:latest

# TODO:增加LABEL TAG

# 设置工作目录
WORKDIR /app

# 1. 先复制依赖声明，利用 Docker 层缓存
COPY package.json ./

# 2. 安装生产依赖
RUN bun install --production

# 3. 复制源码
COPY src ./src

# 4. 设置运行时环境变量（支持注入密钥）运行时可通过 -e LIVEBLOCKS_KEY=xxx覆盖
ENV LIVEBLOCKS_KEY ""

# 5. 运行应用
CMD ["bun", "run", "src/main.ts"]
