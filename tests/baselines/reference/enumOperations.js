var Enum;
(function (Enum) {
    Enum[Enum["None"] = 0] = "None";
})(Enum || (Enum = {}));
var enumType = 0 /* None */;
var numberType = 0;
var anyType = 0;

enumType ^ numberType;
numberType ^ anyType;

enumType & anyType;
enumType | anyType;
enumType ^ anyType;
~anyType;
enumType << anyType;
enumType >> anyType;
enumType >>> anyType;
