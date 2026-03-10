import { createSubscriber } from 'svelte/reactivity';
import * as Y from 'yjs';

export function createYMapSubscriber(yMap: Y.Map<any>): () => void {
    const subscribe = createSubscriber((update) => {
        const handler = () => update();
        yMap.observe(handler);
        return () => yMap.unobserve(handler);
    });
    return subscribe;
}

export function createYArraySubscriber(yArray: Y.Array<any>): () => void {
    const subscribe = createSubscriber((update) => {
        const handler = () => update();
        yArray.observe(handler);
        return () => yArray.unobserve(handler);
    });
    return subscribe;
}

export function createYTextSubscriber(yText: Y.Text): () => void {
    const subscribe = createSubscriber((update) => {
        const handler = () => update();
        yText.observe(handler);
        return () => yText.unobserve(handler);
    });
    return subscribe;
}

export function createYMapKeysSubscriber(yMap: Y.Map<any>): () => void {
    const subscribe = createSubscriber((update) => {
        const handler = () => update();
        yMap.observe(handler);
        return () => yMap.unobserve(handler);
    });
    return subscribe;
}
