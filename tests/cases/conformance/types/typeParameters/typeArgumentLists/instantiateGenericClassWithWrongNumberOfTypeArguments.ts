class C<T> {
    x: T;
}

var c = new C<number, number>();

class D<T, U> {
    x: T
    y: U
}

// BUG 794238
var d = new D<number>();