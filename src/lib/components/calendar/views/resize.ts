import type { Action } from "svelte/action";
import interact from 'interactjs';
import type { Event } from '$lib/states/data';
import dayjs from "dayjs";

type ResizeActionParams = {
    data: Event;
    timeToRowNum: (t: number) => number;
    timeToColNum: (t: number) => number;

    onDragStart: (row: number, col: number) => void;
    onDragEnd: (row: number, col: number) => void;
    onDragOver: (row: number, col: number) => void;
    onResizeEnd: (row?: number, col?: number) => void;
}

const interactAction: Action<HTMLDivElement, ResizeActionParams> = (node, { data, timeToRowNum, timeToColNum, onDragEnd, onDragOver, onDragStart, onResizeEnd }) => {
    interact(node).
        resizable({
            invert: 'reposition',
            autoScroll: false,
            edges: {
                bottom: true,
                top: true,
            },
            listeners: {
                start(event) {
                    node.style.opacity = '50%'
                },
                move(event) {
                    let edge = "";
                    if (event.edges.bottom) {
                        edge += " bottom"
                    }
                    if (event.edges.top) {
                        edge += " top"
                    }
                    console.log(edge);
                    const a = document.elementsFromPoint(event.clientX, event.clientY)
                    const b = a.find((e) => e.classList.contains("cell")) as HTMLDivElement | undefined
                    if (!b) {
                        return;
                    }
                    const start = node.style.gridRowStart;
                    const end = node.style.gridRowEnd;
                    const side = b.style.gridRowStart;

                    const setBottom = (side: string) => {
                        if (end != side) {
                            // console.log("setting bottom", side)
                            node.style.gridRowEnd = side;
                        }
                    }

                    const setTop = (side: string) => {
                        if (start != side) {
                            // console.log("setting top", side)
                            node.style.gridRowStart = side;
                        }
                    }
                    // start 817
                    // end 827
                    // side = 812

                    // start: 812, end:817

                    const originEnd = timeToRowNum(data.end)
                    const originStart = timeToRowNum(data.start)

                    if (event.edges.bottom) {
                        // 拖动的是底部
                        if (Number(side) > originStart) {
                            setBottom(side);
                        } else if (Number(side) < originStart) {
                            setTop(side); // start = 812
                            setBottom(String(originStart)); // end = 817
                        }
                    } else if (event.edges.top) {
                        if (Number(side) < originEnd) {
                            setTop(side);
                        } else if (Number(side) > originEnd) {
                            setBottom(side);
                            setTop(String(originEnd));
                        }
                    }

                    // console.log({ "style": b.style, "computed": b.computedStyleMap })


                },
                end(event) {
                    node.style.opacity = '100%'
                    const a = document.elementsFromPoint(event.clientX, event.clientY)
                    const b = a.find((e) => e.classList.contains("cell")) as HTMLDivElement | undefined
                    if (!b) {
                        return;
                    }
                    const start = node.style.gridRowStart;
                    const end = node.style.gridRowEnd;
                    const side = b.style.gridRowStart;

                    const setBottom = (side: string) => {
                        if (end != side) {
                            // console.log("setting bottom", side)
                            node.style.gridRowEnd = side;
                            const tNo = Number(side) - 2;
                            data.end = dayjs(data.end).hour(Math.floor(tNo / 60)).minute(tNo % 60).valueOf()
                        }
                    }

                    const setTop = (side: string) => {
                        if (start != side) {
                            // console.log("setting top", side)
                            node.style.gridRowStart = side;
                            const tNo = Number(side) - 2;
                            data.start = dayjs(data.end).hour(Math.floor(tNo / 60)).minute(tNo % 60).valueOf()
                        }
                    }
                    const originEnd = timeToRowNum(data.end)
                    const originStart = timeToRowNum(data.start)

                    if (event.edges.bottom) {
                        // 拖动的是底部
                        if (Number(side) > originStart) {
                            setBottom(side);
                            onResizeEnd(undefined, parseInt(side))
                        } else if (Number(side) < originStart) {
                            setTop(side);
                            setBottom(String(originStart));
                            onResizeEnd(parseInt(side), originStart)
                        }
                    } else if (event.edges.top) {
                        if (Number(side) < originEnd) {
                            setTop(side);
                            onResizeEnd(parseInt(side))
                        } else if (Number(side) > originEnd) {
                            setBottom(side);
                            setTop(String(originEnd));
                            onResizeEnd(originEnd, parseInt(side))
                        }
                    }
                }
            }
        }).draggable({
            listeners: {
                start(event) {
                    const lists = document.elementsFromPoint(event.clientX, event.clientY)
                    const cell = lists.find((e) => e.classList.contains("cell")) as HTMLDivElement;

                    onDragStart(parseInt(cell.style.gridRowStart), parseInt(cell.style.gridColumnStart));

                },
                move(event) {
                    // console.log(event)
                    const lists = document.elementsFromPoint(event.clientX, event.clientY)
                    const cell = lists.find((e) => e.classList.contains("cell")) as HTMLDivElement | undefined;
                    if (!cell) {
                        return
                    }
                    // console.log(cell);
                    // 移动时只粗略估计计算格子数量, 落定时再计算准确时间
                    onDragOver(parseInt(cell.style.gridRowStart), parseInt(cell.style.gridColumnStart))
                    // console.log({ row: cell.style.gridRowStart, col: cell.style.gridColumnStart })
                },
                end(event) {
                    const lists = document.elementsFromPoint(event.clientX, event.clientY)
                    const cell = lists.find((e) => e.classList.contains("cell")) as HTMLDivElement;
                    onDragEnd(parseInt(cell.style.gridRowStart), parseInt(cell.style.gridColumnStart))
                }

            }
        })

}
export { interactAction as interact };