//// [commentsEnums.js]
/** Enum of colors*/
var Colors;
(function (Colors) {
    /** Fancy name for 'blue'*/
    Colors[Colors["Cornflower"] = 0] = "Cornflower" /* blue */ ;

    /** Fancy name for 'pink'*/
    Colors[Colors["FancyPink"] = 1] = "FancyPink";
})(Colors || (Colors = {}));
var x = Colors.Cornflower;
x = Colors.FancyPink;


////[commentsEnums.d.ts]
/** Enum of colors*/
declare enum Colors {
    /** Fancy name for 'blue'*/
    Cornflower,
    /** Fancy name for 'pink'*/
    FancyPink,
}
declare var x: Colors;
