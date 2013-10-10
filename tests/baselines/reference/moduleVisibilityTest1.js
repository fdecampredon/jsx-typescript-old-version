var OuterMod;
(function (OuterMod) {
    function someExportedOuterFunc() {
        return -1;
    }
    OuterMod.someExportedOuterFunc = someExportedOuterFunc;

    (function (OuterInnerMod) {
        function someExportedOuterInnerFunc() {
            return "foo";
        }
        OuterInnerMod.someExportedOuterInnerFunc = someExportedOuterInnerFunc;
    })(OuterMod.OuterInnerMod || (OuterMod.OuterInnerMod = {}));
    var OuterInnerMod = OuterMod.OuterInnerMod;
})(OuterMod || (OuterMod = {}));

var OuterInnerAlias = OuterMod.OuterInnerMod;

var M;
(function (M) {
    (function (InnerMod) {
        function someExportedInnerFunc() {
            return -2;
        }
        InnerMod.someExportedInnerFunc = someExportedInnerFunc;
    })(M.InnerMod || (M.InnerMod = {}));
    var InnerMod = M.InnerMod;

    (function (E) {
        E[E["A"] = 0] = "A";
        E[E["B"] = 1] = "B";
        E[E["C"] = 2] = "C";
    })(M.E || (M.E = {}));
    var E = M.E;

    M.x = 5;

    var y = M.x + M.x;

    var B = (function () {
        function B() {
            this.b = 0;
        }
        return B;
    })();

    var C = (function () {
        function C() {
            this.someProp = 1;
            function someInnerFunc() {
                return 2;
            }
            var someInnerVar = 3;
        }
        C.prototype.someMethodThatCallsAnOuterMethod = function () {
            return OuterInnerAlias.someExportedOuterInnerFunc();
        };
        C.prototype.someMethodThatCallsAnInnerMethod = function () {
            return InnerMod.someExportedInnerFunc();
        };
        C.prototype.someMethodThatCallsAnOuterInnerMethod = function () {
            return OuterMod.someExportedOuterFunc();
        };
        C.prototype.someMethod = function () {
            return 0;
        };
        return C;
    })();
    M.C = C;

    var someModuleVar = 4;

    function someModuleFunction() {
        return 5;
    }
})(M || (M = {}));

var M;
(function (M) {
    M.c = M.x;
    M.meb = 1 /* B */;
})(M || (M = {}));

var cprime = null;

var c = new M.C();
var z = M.x;
var alpha = 0 /* A */;
var omega = M.exported_var;
c.someMethodThatCallsAnOuterMethod();
