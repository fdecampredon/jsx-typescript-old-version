// BUG 787697
class C<U extends T, T extends U> { }
class C2<T extends U, U extends V, V extends T> { }

interface I<U extends T, T extends U> { }
interface I2<T extends U, U extends V, V extends T> { }

function f<U extends T, T extends U>() { }
function f2<T extends U, U extends V, V extends T>() { }

var a: {
    <U extends T, T extends U>(): void;
    <T extends U, U extends V, V extends T>(): void;
}

var b = <U extends T, T extends U>() => { }
var b2 = <T extends U, U extends V, V extends T>() => { }