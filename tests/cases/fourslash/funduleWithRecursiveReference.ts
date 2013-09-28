/// <reference path='fourslash.ts'/>

////module M {
////    export function C() {}
////    export module C {
////    export var C/**/ = M.C
////  }
////}

// this line triggers a semantic/syntactic error check, remove line when 788570 is fixed
edit.insert('');

goTo.marker();
verify.quickInfoIs('{ C: typeof C; (): void; }');
verify.numberOfErrorsInCurrentFile(0);