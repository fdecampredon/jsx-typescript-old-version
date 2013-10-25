class C<T extends Date> {
    f() {
        var x: T;
        var a = x['getDate'](); // should be string
        return a + x.getDate();
    }
}

var r = (new C<Date>()).f();

interface I<T extends Date> {
    foo: T;
}
var i: I<Date>;
var r2 = i.foo.getDate();
var r2b = i.foo['getDate']();

var a: {
    <T extends Date>(): T;
}
var r3: string = a<Date>().getDate();
var r3b: string = a()['getDate']();

var b = {
    foo: <T extends Date>(x: T) => {
        var a = x['getDate'](); // should be string
        return a + x.getDate();
    }
}

var r4 = b.foo(new Date());