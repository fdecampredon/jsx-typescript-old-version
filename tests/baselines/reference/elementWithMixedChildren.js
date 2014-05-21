//// [elementWithMixedChildren.ts]
///<jsx />


<li> <img />
    <img src="icon" />
    Text : {myVar.text} 
</li>;

<li>
    <img src="icon" />
    Text : {myVar.text} 
</li>;

<li>
    Text:
    {myVar.text} 
</li>;

<li> hello <div /> </li>;

<li>
    hello world <span>hello &amp;</span>
    hello: world <span /> </li>;

<li>
    hello world <span>hello &amp;
    hello: world </span> </li>;
    
<li>    <span />   <div /></li>;

<a> <span /> {} hello</a>;

//// [elementWithMixedChildren.js]
///<jsx />
li(null, " ", img(null),
    img({ src: "icon" }),
    "Text : ", myVar.text
);

li(null,
    img({ src: "icon" }),
    "Text : ", myVar.text
);

li(null,
    "Text:",
    myVar.text
);

li(null, " hello ", div(null), " ");

li(null,
    "hello world ", span(null, "hello &"),
    "hello: world ", span(null), " ");

li(null,
    "hello world ", span(null, "hello & hello: world "), " ");

li(null, "    ", span(null), "   ", div(null));

a(null, " ", span(null), "  hello");
