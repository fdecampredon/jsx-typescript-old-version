/// <reference path='fourslash.ts'/>

////class A<T> { }
////class B<T> {/*B*/ }
////class C<T> { /*C*/constructor(val: T) { } }
////class D<T> { constructor(/*D*/val: T) { } }
////
////new A/*Asig*/<string>();
////new B/*Bsig*/("");
////new C/*Csig*/("");
////new D/*Dsig*/<string>();

var A = 'A';
var B = 'B';
var C = 'C';
var D = 'D'
goTo.marker(B);
edit.insert('constructor(val: T) { }');
goTo.marker('Asig');
verify.quickInfoIs("<T>(): A<string>", null, A, 'constructor');

goTo.marker('Bsig');
verify.quickInfoIs("<T>(val: string): B<string>", null, B, 'constructor');

goTo.marker('Csig'); 
verify.quickInfoIs("<T>(val: string): C<string>", null, C, 'constructor');

goTo.marker('Dsig');
verify.quickInfoIs("<T>(val: string): D<string>", null, D, 'constructor');

goTo.marker(C);
edit.deleteAtCaret('constructor(val: T) { }'.length);
goTo.marker('Asig');
verify.quickInfoIs("<T>(): A<string>", null, A, 'constructor');

goTo.marker('Bsig');
verify.quickInfoIs("<T>(val: string): B<string>", null, B, 'constructor');

goTo.marker('Csig');
verify.quickInfoIs("<T>(): C<{}>", null, C, 'constructor');

goTo.marker('Dsig');
verify.quickInfoIs("<T>(val: string): D<string>", null, D, 'constructor');

goTo.marker(D);
edit.deleteAtCaret("val: T".length);
goTo.marker('Asig');
verify.quickInfoIs("<T>(): A<string>", null, A, 'constructor');

goTo.marker('Bsig');
verify.quickInfoIs("<T>(val: string): B<string>", null, B, 'constructor');

goTo.marker('Csig');
verify.quickInfoIs("<T>(): C<{}>", null, C, 'constructor');

goTo.marker('Dsig');
verify.quickInfoIs("<T>(): D<string>", null, D, 'constructor');