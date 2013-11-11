function foo<T, U extends T>(x: T, y: U): U { return y; }

foo(1, '');
foo(1, {});

interface NumberVariant extends Number {
    x: number;
}
var n: NumberVariant;
// BUG 818783
var r3 = foo(1, n); // should work

function foo2<T, U extends { length: T }>(x: T, y: U) { return y; }
foo2(1, { length: '' });
foo2(1, { length: {} });
foo2([], ['']);