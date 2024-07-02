type loadFunc<Key> = (currentKey: Key, num: number) => boolean

export class InfiniteScrollController<Key, Element = HTMLElement> {
    currentKey: Key
    loadMoreBefore: loadFunc<Key>
    loadMoreAfter: loadFunc<Key>
    buffer: number

    constructor(currentKey: Key, loadMoreBefore: loadFunc<Key>, loadMoreAfter: loadFunc<Key>, buffer = 5) {
        this.currentKey = currentKey
        this.loadMoreBefore = loadMoreBefore
        this.loadMoreAfter = loadMoreAfter
        this.buffer = buffer
    }

    initAction() {
        const action = () => {
            this.buffer

        }
    }

    onMount(node: Element) {

    }


}