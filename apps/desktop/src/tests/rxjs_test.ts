// 临时验证脚本：用于手动观察 rxjs 行为，命名不匹配 *.test.ts，不会被 vitest 收集。
import { Observable, shareReplay, tap } from "rxjs";

const a = new Observable<string>((subscriber) => {
  subscriber.next("123");
}).pipe(
  tap({
    subscribe() {
      console.log("subscribe");
    },
    unsubscribe() {
      console.log("unsubscribe");
    },
  }),
  shareReplay({ bufferSize: 1, refCount: true }),
);

const sub1 = a.subscribe((val) => {
  console.log(`1: val`);
});

const sub2 = a.subscribe((val) => {
  console.log(`2: val`);
});

setTimeout(() => {
  sub1.unsubscribe();
  sub2.unsubscribe();
}, 5000);
