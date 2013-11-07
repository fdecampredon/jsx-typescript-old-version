/// <reference path='fourslash.ts'/>

////function m2g() { };
////module m2g { export class C { foo(x: number) { } } } 
////var x: m2g./*1*/;
////var r/*2*/ = m2g/*3*/;

goTo.marker('1');
verify.completionListContains('C');

edit.insert('C.');
verify.not.completionListContains('foo');
edit.backspace(1);

goTo.marker('2');
verify.quickInfoIs("{ C: { prototype: m2g.C; new(): m2g.C; }; (): void; }", undefined, "r", "var");

goTo.marker('3');
edit.insert('(');
verify.currentSignatureHelpIs('m2g(): void');