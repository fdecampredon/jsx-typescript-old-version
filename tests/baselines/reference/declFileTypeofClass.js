//// [declFileTypeofClass.js]
var c = (function () {
    function c() {
    }
    return c;
})();

var x;
var y = c;
var z;
var genericC = (function () {
    function genericC() {
    }
    return genericC;
})();
var genericX = genericC;


////[declFileTypeofClass.d.ts]
declare class c {
    static x: string;
    private static y;
    private x3;
    public y3: number;
}
declare var x: c;
declare var y: typeof c;
declare var z: typeof c;
declare class genericC<T> {
}
declare var genericX: typeof genericC;
