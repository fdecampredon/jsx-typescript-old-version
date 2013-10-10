// allowed per spec
var a = +1;
var b = +"";
var E;
(function (E) {
    E[E["some"] = 0] = "some";
    E[E["thing"] = 1] = "thing";
})(E || (E = {}));
;
var c = +0 /* some */;

// also allowed, used to be errors
var x = +"3";
var y = -"3";
var z = ~"3";
