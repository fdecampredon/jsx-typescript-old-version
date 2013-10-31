//// [typeofUndefined.js]
var x;
var x; // shouldn't be an error since type is the same as the first declaration


////[typeofUndefined.d.ts]
declare var x: undefined;
declare var x: any;
