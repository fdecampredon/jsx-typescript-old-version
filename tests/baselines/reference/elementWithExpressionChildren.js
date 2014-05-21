//// [elementWithExpressionChildren.ts]
///<jsx />

<a foo="bar">{ myVar.myMethod() }</a>

//// [elementWithExpressionChildren.js]
///<jsx />
a({ foo: "bar" }, myVar.myMethod());
