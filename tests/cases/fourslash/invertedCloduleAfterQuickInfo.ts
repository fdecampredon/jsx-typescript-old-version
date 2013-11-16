/// <reference path="fourslash.ts" />

////module M {
////    module A {
////        var o;
////    }
////    class A {
////        /**/c
////    }
////}

goTo.marker();
verify.quickInfoExists();
// Bug 823365
// verify.numberOfErrorsInCurrentFile(1); // We get no errors