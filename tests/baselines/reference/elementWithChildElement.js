//// [elementWithChildElement.ts]
///<jsx />

<div> 
    <a>
        <img src="myImage.png" />
    </a> 
</div>

//// [elementWithChildElement.js]
///<jsx />
div(null,
    a(null,
        img({ src: "myImage.png" }))
);
