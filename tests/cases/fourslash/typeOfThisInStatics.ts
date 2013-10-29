/// <reference path='fourslash.ts'/>

////class C {
////    static foo() {
////        var r/*1*/ = this;
////    }
////    static get x() {
////        var r/*2*/ = this;
////        return 1;
////    }
////}

goTo.marker('1');
// BUG 805412
verify.quickInfoIs('{ prototype: C; foo(): any; }');

goTo.marker('2');
// BUG 805412
verify.quickInfoIs('{ prototype: C; foo(): any; x; }');