// Generic functions used as arguments for function typed parameters are not used to make inferences from
// Using construct signature arguments, no errors expected

function foo<T>(x: new(a: T) => T) {
    return new x(null);
}

interface I {
    new <T>(x: T): T;
}
interface I2<T> {
    new (x: T): T;
}
var i: I;
var i2: I2<string>;
var a: {
    new <T>(x: T): T;
}

var r = foo(i); // {}
var r2 = foo<string>(i); // string 
var r3 = foo(i2); // string
var r3b = foo(a); // {}

function foo2<T, U>(x: T, cb: new(a: T) => U) {
    return new cb(x);
}

var r4 = foo2(1, i2); // string, instantiated generic
var r4b = foo2(1, a); // {}, no inferences made from generic signature
var r5 = foo2(1, i); // {}
var r6 = foo2<string, string>('', i2); // string

function foo3<T, U>(x: T, cb: new(a: T) => U, y: U) {
    return new cb(x);
}

var r7 = foo3(null, i, ''); // string
var r7b = foo3(null, a, ''); // string
var r8 = foo3(1, i2, 1); // {}
var r9 = foo3<string, string>('', i2, ''); // string