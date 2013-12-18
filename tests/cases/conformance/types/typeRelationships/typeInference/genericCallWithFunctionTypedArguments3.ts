// No inference is made from function typed arguments which have multiple call signatures

var a: {
    (x: boolean): boolean;
    (x: string): any;
}

function foo4<T, U>(cb: (x: T) => U) {
    var u: U;
    return u;
}

var r = foo4(a); // {}, if a was used for inference then U would have some other type

var b: {
    <T>(x: boolean): T;
    <T>(x: T): any;
}

var r2 = foo4(b); // {}, if b was used for inference then U would have some other type