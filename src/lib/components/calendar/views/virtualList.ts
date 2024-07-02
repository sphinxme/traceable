import {
    elementScroll,
    observeElementOffset,
    observeElementRect,
    observeWindowOffset,
    observeWindowRect,
    Virtualizer,
    windowScroll,
    type Rect,
    type VirtualItem,
} from '@tanstack/virtual-core'
import { onMount, tick } from 'svelte';
// import { createVirtualizer } from '@tanstack/svelte-virtual';
import type { Action } from 'svelte/action';
import { writable, type Writable } from 'svelte/store';

let virtualListEl: HTMLDivElement;
let offsetWidth: number = 700;
let rowWidth = 100;

type VirtualListParams = {
    chunk: number;
    count?: number;
}

function onOffsetWidthChange(node: HTMLElement, onChange: (width: number) => void) {
    let currentWidth = node.offsetWidth;
    const observer = new ResizeObserver(entries => {
        if (currentWidth !== node.offsetWidth) {
            currentWidth = node.offsetWidth
            onChange(currentWidth)
        }
    });

    observer.observe(node);
    return () => {
        observer.disconnect();
    }
}

export class VirtualListController {
    chunk: number = 7;
    count: number = 100;

    private size: number = 100;
    observableSize = writable(this.size);
    virtualizer?: Virtualizer<HTMLDivElement, HTMLDivElement>
    items: Writable<VirtualItem[]> = writable([]);

    constructor(chunk?: number, count?: number) {
        if (chunk) {
            this.chunk = chunk
        }
        if (count) {
            this.count = count;
        }
    }

    getVirtualItems() {
        if (!this.virtualizer) {
            return [];
        }
        return this.virtualizer.getVirtualItems()
    }

    containerSize() {
        return this.observableSize;
    }

    action: Action<HTMLDivElement> = (node) => {
        this.size = node.offsetWidth / this.chunk;
        const items = this.items;

        const virtualizer = new Virtualizer<HTMLDivElement, HTMLDivElement>({
            count: this.count,
            getScrollElement: () => node,
            estimateSize: () => this.size,
            scrollToFn: elementScroll,
            observeElementOffset: observeElementOffset,
            observeElementRect: observeElementRect,
            overscan: 5,
            onChange(instance) {
                items.set(instance.getVirtualItems())
            }
        })
        virtualizer._didMount();
        setTimeout(() => {
            console.log(virtualizer.getVirtualItems());
            items.set(virtualizer.getVirtualItems());
        }, 1000)

        const unobserveOffset = onOffsetWidthChange(node, (width) => {
            if (width !== virtualizer.options.estimateSize(0)) {
                this.size = width / this.chunk;
                virtualizer.setOptions({
                    count: virtualizer.options.count,
                    getScrollElement: () => node,
                    estimateSize: () => this.size,
                    scrollToFn: elementScroll,
                    observeElementOffset: observeElementOffset,
                    observeElementRect: observeElementRect,
                })
                virtualizer._willUpdate()
            }
        })

        return {
            destroy() {
                unobserveOffset();
            },
        }
    }
}

export const virtualList: Action<HTMLDivElement, VirtualListParams> = (node, { chunk, count = 100 }) => {
    let size = node.offsetWidth / chunk;

    const virtualizer = new Virtualizer<HTMLDivElement, HTMLDivElement>({
        count: count,
        getScrollElement: () => node,
        estimateSize: () => size,
        scrollToFn: elementScroll,
        observeElementOffset: observeElementOffset,
        observeElementRect: observeElementRect,
    })
    virtualizer._didMount();

    onOffsetWidthChange(node, (width) => {
        if (width !== virtualizer.options.estimateSize(0)) {
            size = width
            virtualizer.setOptions({
                count: virtualizer.options.count,
                getScrollElement: () => node,
                estimateSize: () => size,
                scrollToFn: elementScroll,
                observeElementOffset: observeElementOffset,
                observeElementRect: observeElementRect,
            })
            virtualizer._willUpdate()
        }
    })

    return {
        update(params) {
            let update = false;
            const newSize = node.offsetWidth / chunk;
            if (newSize !== virtualizer.options.estimateSize(0)) {
                size = newSize
                update = true;
            }

            if (params.count && (params.count !== virtualizer.options.count)) {
                count = params.count;
                update = true;
            }

            if (update) {
                virtualizer.setOptions({
                    count: count,
                    getScrollElement: () => node,
                    estimateSize: () => size,
                    scrollToFn: elementScroll,
                    observeElementOffset: observeElementOffset,
                    observeElementRect: observeElementRect,
                })
                virtualizer._willUpdate()
            }
        },
    }
}