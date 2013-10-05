var x = '';
var a = x.charAt(0);
var b = x.hasOwnProperty('charAt');

var c = x['charAt'](0);
var d = x['charAt']('invalid'); // error
var e = x['hasOwnProperty']('toFixed');