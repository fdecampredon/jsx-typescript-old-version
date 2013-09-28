class A {
    constructor(public x: string) {
    }
}
class B extends A {
    constructor(x: string, public data: string) {
        super(x);
    }
}
class C extends A {
    constructor(x: string) {
        super(x);
    }
}

var b: typeof A = B; // error
var c: typeof A = C; // ok