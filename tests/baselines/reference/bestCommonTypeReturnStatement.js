
function f() {
    if (true)
        return b();
    return d();
}

function b() {
    return null;
}
function d() {
    return null;
}
