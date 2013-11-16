//// [declFileRestParametersOfFunctionAndFunctionType.js]
function f1() {
    var args = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        args[_i] = arguments[_i + 0];
    }
}
function f2(x) {
}
function f3(x) {
}
function f4() {
}
function f5() {
}
var f6 = function () {
    return [10];
};


////[declFileRestParametersOfFunctionAndFunctionType.d.ts]
declare function f1(...args: any[]): void;
declare function f2(x: (...args: any[]) => void): void;
declare function f3(x: (...args: any[]) => void): void;
declare function f4<T extends (...args: any[]) => void>(): void;
declare function f5<T extends (...args: any[]) => void>(): void;
declare var f6: () => any[];
