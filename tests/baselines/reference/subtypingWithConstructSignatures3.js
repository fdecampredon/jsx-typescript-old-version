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

    var r1arg1;
    var r1arg2;
    var r1 = foo2(r1arg1);
    var r1a = [r1arg2, r1arg1];
    var r1b = [r1arg1, r1arg2];

    var r2arg1;
    var r2arg2;
    var r2 = foo7(r2arg1);
    var r2a = [r2arg2, r2arg1];
    var r2b = [r2arg1, r2arg2];

    var r3arg1;
    var r3arg2;
    var r3 = foo8(r3arg1);
    var r3a = [r3arg2, r3arg1];
    var r3b = [r3arg1, r3arg2];

    var r4arg1;
    var r4arg2;
    var r4 = foo10(r4arg1);
    var r4a = [r4arg2, r4arg1];
    var r4b = [r4arg1, r4arg2];

    var r5arg1;
    var r5arg2;
    var r5 = foo11(r5arg1);
    var r5a = [r5arg2, r5arg1];
    var r5b = [r5arg1, r5arg2];

    var r6arg1;
    var r6arg2;
    var r6 = foo12(r6arg1);
    var r6a = [r6arg2, r6arg1];
    var r6b = [r6arg1, r6arg2];

    var r7arg1;
    var r7arg2;
    var r7 = foo15(r7arg1);
    var r7a = [r7arg2, r7arg1];
    var r7b = [r7arg1, r7arg2];

    var r7arg3;
    var r7c = foo15(r7arg3);
    var r7d = [r7arg2, r7arg3];
    var r7e = [r7arg3, r7arg2];

    var r8arg;
    var r8 = foo16(r8arg);

    var r9arg;
    var r9 = foo17(r9arg);
})(Errors || (Errors = {}));

var WithGenericSignaturesInBaseType;
(function (WithGenericSignaturesInBaseType) {
    var r2arg2;
    var r2 = foo2(r2arg2);

    var r3arg2;
    var r3 = foo3(r3arg2);
})(WithGenericSignaturesInBaseType || (WithGenericSignaturesInBaseType = {}));
