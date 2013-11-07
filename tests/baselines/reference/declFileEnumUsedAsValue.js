//// [declFileEnumUsedAsValue.js]
var e;
(function (e) {
    e[e["a"] = 0] = "a";
    e[e["b"] = 1] = "b";
    e[e["c"] = 2] = "c";
})(e || (e = {}));
var x = e;


////[declFileEnumUsedAsValue.d.ts]
declare enum e {
    a = 0,
    b = 1,
    c = 2,
}
declare var x: {
    a: e;
    b: e;
    c: e;
    [x: number]: string;
};
