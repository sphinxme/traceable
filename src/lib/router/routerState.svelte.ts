import { onDestroy } from 'svelte';

class Router {

    public path = $derived(window.location.pathname);

    constructor() { }

    private handlePopState = () => {
        console.log("handled")
        this.path = window.location.pathname;
    };

    private isInitialized = false;

    public init() {
        if (this.isInitialized) return;

        console.log('registered')

        window.addEventListener('popstate', this.handlePopState);
    }

    public destory() {
        if (this.isInitialized) {
            console.log('destoryed')
            window.removeEventListener('popstate', this.handlePopState);
            this.isInitialized = false;
        }
    }


    public navigate(to: string) {
        console.log(`navigate to ${to}`)
        history.pushState({}, '', to);
        this.path = to;
    }
}

// 导出这个 store 的单例
export const router = new Router();