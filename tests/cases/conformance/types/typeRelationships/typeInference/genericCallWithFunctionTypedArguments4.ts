// No inference is made from function typed arguments which have multiple call signatures

class C { foo: string }
class D { bar: string }
var a: {
    new(x: boolean): C;
    new(x: string): D;
}

function foo4<T, U>(cb: new(x: T) => U) {
    var u: U;
    return u;
}

var r = foo4(a); // {}, if a was used for inference then U would have some other type

var b: {
    new<T>(x: boolean): T;
    new<T>(x: T): any;
}

var r2 = foo4(b); // {}, if b was used for inference then U would have some other type