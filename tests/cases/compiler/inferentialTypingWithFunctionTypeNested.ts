declare function map<T, U>(x: T, f: () => { x: (s: T) => U }): U;
declare function identity<V>(y: V): V;

var s: string = map("", () => { return { x: identity }; });