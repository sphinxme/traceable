import { getContext } from 'svelte';
import type { Store } from './store.svelte';

export function useStore(): Store {
    const store = getContext<Store>('store');
    if (!store) {
        throw new Error('Store context not found. Make sure to set the store context in the root component.');
    }
    return store;
}
