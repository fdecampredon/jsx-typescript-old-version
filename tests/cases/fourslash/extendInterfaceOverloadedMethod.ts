/// <reference path='fourslash.ts'/>

////interface A<T> {
////    foo(a: T): B<T>;
////    foo(): void ;
////    foo2(): B<number>;
////}
////interface B<T> extends A<T> {
////    bar(): void ;
////}
////var b: B<number>;
////var x/**/ = b.foo2().foo(5).foo(); // 'x' is of type 'void'

// this line triggers a semantic/syntactic error check, remove line when 788570 is fixed
edit.insert('');

goTo.marker();
// Bug 778445: Wrong error here
// verify.quickInfoIs('void');
// verify.numberOfErrorsInCurrentFile(0);
verify.quickInfoIs('any');
verify.numberOfErrorsInCurrentFile(2);
