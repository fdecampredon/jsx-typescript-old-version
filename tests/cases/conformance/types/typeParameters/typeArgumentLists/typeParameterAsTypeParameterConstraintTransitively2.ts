interface A { foo: number }
interface B extends A { bar: string; }
interface C extends B { baz: boolean; }
var a: A;
var b: B;
var c: C;

function foo<T, U extends T, V extends U>(x: T, y: U, z: V): V { return z; }

foo(1, 2, '');
foo({ x: 1 }, { x: 1, y: '' }, { x: 2, y: 2, z: true });
foo(a, b, a);
foo(a, { foo: 1, bar: '', hm: true }, b);
foo((x: number, y: string) => { }, (x, y: boolean) => { }, () => { });

function foo2<T extends A, U extends T, V extends U>(x: T, y: U, z: V): V { return z; }
foo(b, a, c);
foo(c, c, a);