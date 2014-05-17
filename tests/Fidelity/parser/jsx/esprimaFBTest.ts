///<jsx />

<a />;

<a foo="bar"> {value} <b><c /></b></a>;

<a
/>;

<日本語></日本語>;

<a b={x ? <c /> : <d />} />;

<a>{}</a>;

<a>{/* this is a comment */}</a>;

<div>@test content</div>;

<div><br />7x invalid-js-identifier</div>;

<a.b></a.b>;

<a.b.c></a.b.c>;


//TODO multilple statement containing XJSElement without semilicon seems to not working property
// ex: <a />\n<a/> won't work
//<n:a n:v /> we does not support namespace
//<a n:foo="bar"> {value} <b><c /></b></a> we does not support namespace
//<a b={" "} c=" " d="&amp;" /> we does not translate html entities at parse time
/*<AbC-def
test="&#x0026;&#38;">
bar
baz
</AbC-def>*/ //we does not support invalid javascript token in node
//<LeftRight left=<a /> right=<b>monkeys /> gorillas</b> /> we does not support the syntax <tag attribute=<tag /> /> for now