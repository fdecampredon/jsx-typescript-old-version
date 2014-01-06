// checking subtype relations for function types as it relates to contextual signature instantiation
// error cases
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

    var WithNonGenericSignaturesInBaseType;
    (function (WithNonGenericSignaturesInBaseType) {
        // target type with non-generic call signatures
        var a2;
        var a7;
        var a8;
        var a10;
        var a11;
        var a12;
        var a14;
        var a15;
        var a16;
        var a17;

        var b2;
        a2 = b2; // error, contextual signature instantiation doesn't relate return types so U is {}, not a subtype of string[]
        b2 = a2; // error

        var b7;
        a7 = b7; // error, no inferences for V so it doesn't satisfy its constraints and contextual signature instantiation fails
        b7 = a7; // error

        var b8;
        a8 = b8; // error, type mismatch
        b8 = a8; // error

        var b10;
        a10 = b10; // error, more specific type in derived parameter type
        b10 = a10; // error

        var b11;
        a11 = b11; // error
        b11 = a11; // error

        var b12;
        a12 = b12; // error, no inferences for T, fails constraint satisfaction, fails contextual signature instantiation
        b12 = a12; // error

        var b15;
        a15 = b15; // error, T is {} which isn't an acceptable return type
        b15 = a15; // error

        var b15a;
        a15 = b15a; // error, T is {} which doesn't satisfy constraint check
        b15a = a15; // error

        var b16;
        a16 = b16; // error, cannot make inferences for T because multiple signatures to infer from, {} not compatible with base signature
        b16 = a16; // error

        var b17;
        a17 = b17; // error
        b17 = a17;
    })(WithNonGenericSignaturesInBaseType || (WithNonGenericSignaturesInBaseType = {}));

    var WithGenericSignaturesInBaseType;
    (function (WithGenericSignaturesInBaseType) {
        // target type has generic call signature
        var a2;
        var b2;
        a2 = b2; // error
        b2 = a2; // error

        // target type has generic call signature
        var a3;
        var b3;
        a3 = b3; // error
        b3 = a3; // error
    })(WithGenericSignaturesInBaseType || (WithGenericSignaturesInBaseType = {}));
})(Errors || (Errors = {}));
