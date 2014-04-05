// The first case here (BugExhibition<T>) caused a crash. Try with different permutations of features.
var BugExhibition = (function () {
    function BugExhibition() {
    }
    BugExhibition.prototype.exhibitBug = function () {
        function localFunction() {
        }
        var x;
        x = localFunction;
    };
    return BugExhibition;
})();

var BugExhibition2 = (function () {
    function BugExhibition2() {
    }
    Object.defineProperty(BugExhibition2, "exhibitBug", {
        get: function () {
            function localFunction() {
            }
            var x;
            x = localFunction;
            return null;
        },
        enumerable: true,
        configurable: true
    });
    return BugExhibition2;
})();

var BugExhibition3 = (function () {
    function BugExhibition3() {
    }
    BugExhibition3.prototype.exhibitBug = function () {
        function localGenericFunction(u) {
        }
        var x;
        x = localGenericFunction;
    };
    return BugExhibition3;
})();

var C = (function () {
    function C() {
    }
    C.prototype.exhibit = function () {
        var funcExpr = function (u) {
        };
        var x;
        x = funcExpr;
    };
    return C;
})();

var M;
(function (M) {
    function exhibitBug() {
        function localFunction() {
        }
        var x;
        x = localFunction;
    }
    M.exhibitBug = exhibitBug;
})(M || (M = {}));

var E;
(function (E) {
    E[E["A"] = (function () {
        function localFunction() {
        }
        var x;
        x = localFunction;
        return 0;
    })()] = "A";
})(E || (E = {}));
