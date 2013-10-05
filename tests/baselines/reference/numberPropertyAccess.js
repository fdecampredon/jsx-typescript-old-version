var x = 1;
var a = x.toExponential();

// BUG 791079
var b = x.hasOwnProperty('toFixed');

var c = x['toExponential']();
var d = x['hasOwnProperty']('toFixed');
