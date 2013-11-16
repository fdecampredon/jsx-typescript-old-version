//// [structuralTypeInDeclareFileForModule.js]
var M;
(function (M) {
    M.x;
})(M || (M = {}));
var m = M;


////[structuralTypeInDeclareFileForModule.d.ts]
declare module M {
    var x: any;
}
declare var m: typeof M;
