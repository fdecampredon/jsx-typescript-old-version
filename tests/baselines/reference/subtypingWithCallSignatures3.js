// checking subtype relations for function types as it relates to contextual signature instantiation
// error cases, so function calls will all result in 'any'
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Errors;
(function (Errors) {
    var Base = (function () {
        function Base() {
        }
        return Base;
    })();
    var Derived = (function (_super) {
        __extends(Derived, _super);
        function Derived() {
            _super.apply(this, arguments);
        }
        return Derived;
    })(Base);
    var Derived2 = (function (_super) {
        __extends(Derived2, _super);
        function Derived2() {
            _super.apply(this, arguments);
        }
        return Derived2;
    })(Derived);
    var OtherDerived = (function (_super) {
        __extends(OtherDerived, _super);
        function OtherDerived() {
            _super.apply(this, arguments);
        }
        return OtherDerived;
    })(Base);

    var r1 = foo2(function (x) {
        return null;
    });
    var r1a = [function (x) {
            return [''];
        }, function (x) {
            return null;
        }];
    var r1b = [function (x) {
            return null;
        }, function (x) {
            return [''];
        }];

    var r2arg = function (x) {
        return function (r) {
            return null;
        };
    };
    var r2arg2 = function (x) {
        return function (r) {
            return null;
        };
    };
    var r2 = foo7(r2arg);
    var r2a = [r2arg2, r2arg];
    var r2b = [r2arg, r2arg2];

    var r3arg = function (x, y) {
        return function (r) {
            return null;
        };
    };
    var r3arg2 = function (x, y) {
        return function (r) {
            return null;
        };
    };
    var r3 = foo8(r3arg);
    var r3a = [r3arg2, r3arg];
    var r3b = [r3arg, r3arg2];

    var r4arg = function () {
        var x = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            x[_i] = arguments[_i + 0];
        }
        return null;
    };
    var r4arg2 = function () {
        var x = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            x[_i] = arguments[_i + 0];
        }
        return null;
    };
    var r4 = foo10(r4arg);
    var r4a = [r4arg2, r4arg];
    var r4b = [r4arg, r4arg2];

    var r5arg = function (x, y) {
        return null;
    };
    var r5arg2 = function (x, y) {
        return null;
    };
    var r5 = foo11(r5arg);
    var r5a = [r5arg2, r5arg];
    var r5b = [r5arg, r5arg2];

    var r6arg = function (x, y) {
        return null;
    };
    var r6arg2 = function (x, y) {
        return null;
    };
    var r6 = foo12(r6arg);
    var r6a = [r6arg2, r6arg];
    var r6b = [r6arg, r6arg2];

    var r7arg = function (x) {
        return null;
    };
    var r7arg2 = function (x) {
        return 1;
    };
    var r7 = foo15(r7arg);
    var r7a = [r7arg2, r7arg];
    var r7b = [r7arg, r7arg2];

    var r7arg3 = function (x) {
        return 1;
    };
    var r7c = foo15(r7arg3);
    var r7d = [r7arg2, r7arg3];
    var r7e = [r7arg3, r7arg2];

    var r8arg = function (x) {
        return null;
    };
    var r8 = foo16(r8arg);

    var r9arg = function (x) {
        return null;
    };
    var r9 = foo17(r9arg);
})(Errors || (Errors = {}));

var WithGenericSignaturesInBaseType;
(function (WithGenericSignaturesInBaseType) {
    var r2arg2 = function (x) {
        return [''];
    };
    var r2 = foo2(r2arg2);

    var r3arg2 = function (x) {
        return null;
    };
    var r3 = foo3(r3arg2);
})(WithGenericSignaturesInBaseType || (WithGenericSignaturesInBaseType = {}));
