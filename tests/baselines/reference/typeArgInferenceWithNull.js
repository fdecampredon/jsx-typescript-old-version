// All legal
function fn4(n) {
}
fn4(null);

function fn5(n) {
}
fn5({ x: null });

function fn6(n, fun, n2) {
}
fn6({ x: null }, function (y) {
}, { x: "" }); // y has type { x: any }, but ideally would have type { x: string }
