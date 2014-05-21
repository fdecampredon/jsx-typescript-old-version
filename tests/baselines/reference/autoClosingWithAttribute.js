//// [autoClosingWithAttribute.ts]
///<jsx />

<a foo={ bar() } hello="world" world='hello' />

//// [autoClosingWithAttribute.js]
///<jsx />
a({ foo: bar(), hello: "world", world: 'hello' });
