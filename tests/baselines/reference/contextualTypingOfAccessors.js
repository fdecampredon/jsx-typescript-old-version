// not contextually typing accessors
var x;

x = {
    get foo() {
        return function (n) {
            return n;
        };
    },
    set foo(x) {
    }
};
