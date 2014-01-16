// The || operator permits the operands to be of any type.
// If the || expression is not contextually typed, the right operand is contextually typed
// by the type of the left operand and the result is of the best common type of the two
// operand types.
var E;
(function (E) {
    E[E["a"] = 0] = "a";
    E[E["b"] = 1] = "b";
    E[E["c"] = 2] = "c";
})(E || (E = {}));

var a1;
var a2;
var a3;
var a4;
var a5;
var a6;
var a7;
var a8;

var ra1 = a1 || a1;
var ra2 = a2 || a1;
var ra3 = a3 || a1;
var ra4 = a4 || a1;
var ra5 = a5 || a1;
var ra6 = a6 || a1;
var ra7 = a7 || a1;
var ra8 = a8 || a1;
var ra9 = null || a1;
var ra10 = undefined || a1;

var rb1 = a1 || a2;
var rb2 = a2 || a2;
var rb3 = a3 || a2;
var rb4 = a4 || a2;
var rb5 = a5 || a2;
var rb6 = a6 || a2;
var rb7 = a7 || a2;
var rb8 = a8 || a2;
var rb9 = null || a2;
var rb10 = undefined || a2;

var rc1 = a1 || a3;
var rc2 = a2 || a3;
var rc3 = a3 || a3;
var rc4 = a4 || a3;
var rc5 = a5 || a3;
var rc6 = a6 || a3;
var rc7 = a7 || a3;
var rc8 = a8 || a3;
var rc9 = null || a3;
var rc10 = undefined || a3;

var rd1 = a1 || a4;
var rd2 = a2 || a4;
var rd3 = a3 || a4;
var rd4 = a4 || a4;
var rd5 = a5 || a4;
var rd6 = a6 || a4;
var rd7 = a7 || a4;
var rd8 = a8 || a4;
var rd9 = null || a4;
var rd10 = undefined || a4;

var re1 = a1 || a5;
var re2 = a2 || a5;
var re3 = a3 || a5;
var re4 = a4 || a5;
var re5 = a5 || a5;
var re6 = a6 || a5;
var re7 = a7 || a5;
var re8 = a8 || a5;
var re9 = null || a5;
var re10 = undefined || a5;

var rg1 = a1 || a6;
var rg2 = a2 || a6;
var rg3 = a3 || a6;
var rg4 = a4 || a6;
var rg5 = a5 || a6;
var rg6 = a6 || a6;
var rg7 = a7 || a6;
var rg8 = a8 || a6;
var rg9 = null || a6;
var rg10 = undefined || a6;

var rh1 = a1 || a7;
var rh2 = a2 || a7;
var rh3 = a3 || a7;
var rh4 = a4 || a7;
var rh5 = a5 || a7;
var rh6 = a6 || a7;
var rh7 = a7 || a7;
var rh8 = a8 || a7;
var rh9 = null || a7;
var rh10 = undefined || a7;

var ri1 = a1 || a8;
var ri2 = a2 || a8;
var ri3 = a3 || a8;
var ri4 = a4 || a8;
var ri5 = a5 || a8;
var ri6 = a6 || a8;
var ri7 = a7 || a8;
var ri8 = a8 || a8;
var ri9 = null || a8;
var ri10 = undefined || a8;

var rj1 = a1 || null;
var rj2 = a2 || null;
var rj3 = a3 || null;
var rj4 = a4 || null;
var rj5 = a5 || null;
var rj6 = a6 || null;
var rj7 = a7 || null;
var rj8 = a8 || null;
var rj9 = null || null;
var rj10 = undefined || null;

var rf1 = a1 || undefined;
var rf2 = a2 || undefined;
var rf3 = a3 || undefined;
var rf4 = a4 || undefined;
var rf5 = a5 || undefined;
var rf6 = a6 || undefined;
var rf7 = a7 || undefined;
var rf8 = a8 || undefined;
var rf9 = null || undefined;
var rf10 = undefined || undefined; // undefined || undefined is any
