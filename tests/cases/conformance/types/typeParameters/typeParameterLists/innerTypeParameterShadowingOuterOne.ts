function f<T extends Date>() {
    function g<T extends Number>() {
        var x: T;
        x.toFixed();
    }
    var x: T;
    x.getDate();
}

function f2<T extends Date, U extends T>() {
    function g<T extends Number, U extends T>() {
        var x: U;
        x.toFixed();
    }
    var x: U;
    x.getDate();
}