// parentheses should be omitted
// literals
{ a: 0 };
[1, 3];
"string";
23.0;
/regexp/g;
false;
true;
null;

// names and dotted names
this;
this.x;
a.x;
a;
a[0];
a.b["0"];
a().x;

// should keep the parentheses in emit
(new A).foo;
(typeof A).x;
(-A).x;
new (A());
(function () {
})();
(function foo() {
})();
(-A).x;

// nested cast, should keep one pair of parenthese
(-A).x;

// nested parenthesized expression, should keep one pair of parenthese
(A);
