class A {
    foo(): string { return ''; }
}

class B extends A {
    bar(): string {
        return '';
    }
}

class C<U extends T, T extends A> {
    f() {
        var x: U;
        var a = x['foo'](); // should be string
        return a + x.foo();
    }

    g(x: U) {
        var a = x['foo'](); // should be string
        return a + x.foo();
    }
}

var r1 = (new C<B, A>()).f();
var r1b = (new C<B, A>()).g(new B());

interface I<U extends T, T extends A> {
    foo: U;
}
var i: I<B, A>;
var r2 = i.foo.foo();
var r2b = i.foo['foo']();

var a: {
    <U extends T, T extends A>(): U;
    <U extends T, T extends A>(x: U): U;
}
var r3: string = a().foo();
var r3b: string = a()['foo']();
// parameter supplied for type argument inference
var r3c: string = a(new B()).foo();
var r3d: string = a(new B())['foo']();

var b = {
    foo: <U extends T, T extends A>(x: U) => {
        var a = x['foo'](); // should be string
        return a + x.foo();
    }
}

var r4 = b.foo(new B());