var x: any;
var a = new x();
var b = new x('hello');
var c = new x(x);

// BUG 790977
var d = new x<any>(x); // no error