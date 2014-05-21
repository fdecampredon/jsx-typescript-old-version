//// [expressionWithJsxElement.ts]
///<jsx />
<ul> {myArray.map((text) => <li>{text}</li>)} </ul>

//// [expressionWithJsxElement.js]
///<jsx />
ul(null, " ", myArray.map(function (text) {
        return li(null, text);
    }), " ");
