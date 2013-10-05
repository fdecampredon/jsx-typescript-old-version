class A {
    foo(): string { return ''; }
}

class B extends A {
    bar(): string {
        return '';
    }
}

class C<U extends A, T extends U> {
    f() {
        var x: T;
        var a = x['foo'](); // should be string
        return a + x.foo();
    }

    g(x: U) {
        var a = x['foo'](); // should be string
        return a + x.foo();
    }
}

var r1a = (new C<A, B>()).f();
var r1b = (new C<A, B>()).g(new B());

interface I<U extends A, T extends U> {
    foo: T;
}
var i: I<A, B>;
var r2 = i.foo.foo();
var r2b = i.foo['foo']();

var a: {
    <U extends A, T extends U>(): T;
    <U extends T, T extends A>(x: U): U;
}
var r3: string = a().foo();
var r3b: string = a()['foo']();
// parameter supplied for type argument inference
var r3c: string = a(new B()).foo();
var r3d: string = a(new B())['foo']();

var b = {
    foo: <U extends A, T extends U>(x: T) => {
        var a = x['foo'](); // should be string
        return a + x.foo();
    }
}

var r4 = b.foo(new B());