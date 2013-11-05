/// <reference path='fourslash.ts'/>

////module Underscore {
////    export interface Iterator<T, U> {
////        <T,U>(value: T, index: any, list: any): U;
////    }
////
////    export interface Static {
////        all<T>(list: T[], iterator?: Iterator<T, boolean>, context?: any): T;
////        identity<T>(value: T): T;
////    }
////}
////
////declare var _: Underscore.Static;
////var r/*1*/ = _.all([true, 1, null, 'yes'], _.identity);
////var r2/*2*/ = _.all([true], _.identity);
////var r3/*3*/ = _.all([], _.identity);
////var r4/*4*/ = _.all([<any>true], _.identity);

goTo.marker('1');
verify.quickInfoIs('{}');

goTo.marker('2');
verify.quickInfoIs('boolean');

goTo.marker('3');
verify.quickInfoIs('{}');

goTo.marker('4');
verify.quickInfoIs('any');

verify.numberOfErrorsInCurrentFile(0);
