// inner type parameters shadow outer ones of the same name
// no errors expected
function f() {
    function g() {
        var x;
        x.toFixed();
    }
    var x;
    x.getDate();
}

function f2() {
    function g() {
        var x;
        x.toFixed();
    }
    var x;
    x.getDate();
}
