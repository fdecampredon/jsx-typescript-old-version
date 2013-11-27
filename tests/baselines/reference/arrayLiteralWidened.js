// array literals are widened upon assignment according to their element type
var a = [];

var a = [null, null];
var a = [undefined, undefined];

var b = [[], [null, null]];
var b = [[], []];
var b = [[undefined, undefined]];

var c = [[[]]];
var c = [[[null]], [undefined]];
