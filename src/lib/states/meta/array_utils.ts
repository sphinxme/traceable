
interface ArrayLike<T> {
    /**
        Deletes elements starting from an index.
        @param {number} index Index at which to start deleting elements
        @param {number} length The number of elements to remove. Defaults to 1.
    */
    delete(index: number, length?: number): void;

    /**
   * Inserts new content at an index.
   *
   * Important: This function expects an array of content. Not just a content
   * object. The reason for this "weirdness" is that inserting several elements
   * is very efficient when it is done as a single operation.
   *
   * @example
   *  // Insert character 'a' at position 0
   *  yarray.insert(0, ['a'])
   *  // Insert numbers 1, 2 at position 1
   *  yarray.insert(1, [1, 2])
   *
   * @param {number} index The index to insert content at.
   * @param {Array<T>} content The array of content
   */
    insert(index: number, content: Array<T>): void;

    /**
     * Transforms this YArray to a JavaScript Array.
     *
     * @return {Array<T>}
     */
    toArray(): Array<T>;
}


export function move<T>(arr: ArrayLike<T>, item: T, newIndex: number): void {
    // 获取当前数组形式
    const array = arr.toArray();

    // 查找目标元素的索引
    const currentIndex = array.indexOf(item);

    // 如果目标元素不存在，抛出错误
    if (currentIndex === -1) {
        throw new Error(`Item "${item}" not found in the array.`);
    }

    // 确保 newIndex 在合法范围内
    if (newIndex < 0) {
        newIndex = 0;
    } else if (newIndex > array.length - 1) {
        newIndex = array.length - 1;
    }

    // 如果目标位置与当前位置相同，无需操作
    if (currentIndex === newIndex) {
        return;
    }

    // 删除原位置的元素
    arr.delete(currentIndex);

    // 插入到新位置
    arr.insert(newIndex, [item]);
}