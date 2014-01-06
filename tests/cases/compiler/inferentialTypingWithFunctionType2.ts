function identity<A>(a: A): A {
    return a;
}
var x: number = [1, 2, 3].map(identity)[0];