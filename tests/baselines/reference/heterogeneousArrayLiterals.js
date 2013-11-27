// type of an array is the best common type of its elements (plus its contextual type if it exists)
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var a = [1, ''];
var b = [1, null];
var c = [1, '', null];
var d = [{}, 1];
var e = [{}, Object];

var f = [[], [1]];
var g = [[1], ['']];

var h = [{ foo: 1, bar: '' }, { foo: 2 }];
var i = [{ foo: 1, bar: '' }, { foo: '' }];

var j = [function () {
        return 1;
    }, function () {
        return '';
    }];
var k = [function () {
        return 1;
    }, function () {
        return 1;
    }];
var l = [function () {
        return 1;
    }, function () {
        return null;
    }];
var m = [function () {
        return 1;
    }, function () {
        return '';
    }, function () {
        return null;
    }];
var n = [[function () {
            return 1;
        }], [function () {
            return '';
        }]];

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
})(Base);
var base;
var derived;
var derived2;

var Derived;
(function (Derived) {
    var h = [{ foo: base, basear: derived }, { foo: base }];
    var i = [{ foo: base, basear: derived }, { foo: derived }];

    var j = [function () {
            return base;
        }, function () {
            return derived;
        }];
    var k = [function () {
            return base;
        }, function () {
            return 1;
        }];
    var l = [function () {
            return base;
        }, function () {
            return null;
        }];
    var m = [function () {
            return base;
        }, function () {
            return derived;
        }, function () {
            return null;
        }];
    var n = [[function () {
                return base;
            }], [function () {
                return derived;
            }]];
    var o = [derived, derived2];
    var p = [derived, derived2, base];
    var q = [[function () {
                return derived2;
            }], [function () {
                return derived;
            }]];
})(Derived || (Derived = {}));

var WithContextualType;
(function (WithContextualType) {
    // no errors
    var a = [derived, derived2];
    var b = [null];
    var c = [];
    var d = [function () {
            return derived;
        }, function () {
            return derived2;
        }];
})(WithContextualType || (WithContextualType = {}));

function foo(t, u) {
    var a = [t, t];
    var b = [t, null];
    var c = [t, u];
    var d = [t, 1];
    var e = [function () {
            return t;
        }, function () {
            return u;
        }];
    var f = [function () {
            return t;
        }, function () {
            return u;
        }, function () {
            return null;
        }];
}

function foo2(t, u) {
    var a = [t, t];
    var b = [t, null];
    var c = [t, u];
    var d = [t, 1];
    var e = [function () {
            return t;
        }, function () {
            return u;
        }];
    var f = [function () {
            return t;
        }, function () {
            return u;
        }, function () {
            return null;
        }];

    var g = [t, base];
    var h = [t, derived];
    var i = [u, base];
    var j = [u, derived];
}

function foo3(t, u) {
    var a = [t, t];
    var b = [t, null];
    var c = [t, u];
    var d = [t, 1];
    var e = [function () {
            return t;
        }, function () {
            return u;
        }];
    var f = [function () {
            return t;
        }, function () {
            return u;
        }, function () {
            return null;
        }];

    var g = [t, base];
    var h = [t, derived];
    var i = [u, base];
    var j = [u, derived];
}

function foo4(t, u) {
    var a = [t, t];
    var b = [t, null];
    var c = [t, u];
    var d = [t, 1];
    var e = [function () {
            return t;
        }, function () {
            return u;
        }];
    var f = [function () {
            return t;
        }, function () {
            return u;
        }, function () {
            return null;
        }];

    var g = [t, base];
    var h = [t, derived];
    var i = [u, base];
    var j = [u, derived];

    var k = [t, u];
}
