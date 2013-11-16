//// [functionReturningItself.js]
function somefn() {
    return somefn;
}


////[functionReturningItself.d.ts]
declare function somefn(): typeof somefn;
