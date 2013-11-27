// 3.8.4 Assignment Compatibility

var x;

// Should fail
x = '';
x = [''];
x = 4;
x = {};

// Should work
function f() {
}
;
x = f;

function fn(c) {
}

// Should Fail
fn('');
fn(['']);
fn(4);
fn({});

// Should work
fn(function (a) {
});
