var i;
var r1 = i.apply;
var r1b = i.call;
var r1c = i.arguments;
var r1d = i.data;

// BUG 792592
var r1e = i['hm'];

var x;

var r2 = x.apply;
var r2b = x.call;
var r2c = x.arguments;
var r2d = x.data;

// BUG 792592
var r2e = x['hm']; // should be Object
