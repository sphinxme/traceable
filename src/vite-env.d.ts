/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly [key: string]: string;
    // readonly VITE_SOME_KEY: string; // 定义你的环境变量
    // 其他的环境变量...
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}