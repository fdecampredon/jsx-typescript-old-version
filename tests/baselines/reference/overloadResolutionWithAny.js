var func;

func(""); // number
func(3); // string
var x;
func(x); // string

var func2;

func2(x, x); // string
func2("", ""); // number
func2(x, ""); // boolean
func2("", x); // RegExp
