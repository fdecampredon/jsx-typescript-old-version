//// [internalAliasEnum.js]
var a;
(function (a) {
    (function (weekend) {
        weekend[weekend["Friday"] = 0] = "Friday";
        weekend[weekend["Saturday"] = 1] = "Saturday";
        weekend[weekend["Sunday"] = 2] = "Sunday";
    })(a.weekend || (a.weekend = {}));
    var weekend = a.weekend;
})(a || (a = {}));

var c;
(function (c) {
    var b = a.weekend;
    c.bVal = 2 /* Sunday */;
})(c || (c = {}));


////[internalAliasEnum.d.ts]
declare module a {
    enum weekend {
        Friday,
        Saturday,
        Sunday,
    }
}
declare module c {
    var bVal: a.weekend;
}
