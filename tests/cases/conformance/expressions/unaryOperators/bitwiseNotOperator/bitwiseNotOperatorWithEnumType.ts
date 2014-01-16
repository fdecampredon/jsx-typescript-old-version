// ~ operator on enum type

enum ENUM1 { 1, 2, "" };

// enum type var
var ResultIsNumber1 = ~ENUM1;

// enum type expressions
var ResultIsNumber2 = ~ENUM1[1];
var ResultIsNumber3 = ~(ENUM1[1] + ENUM1[2]);

// multiple ~ operators
var ResultIsNumber4 = ~~~(ENUM1[1] + ENUM1[2]);

// miss assignment operators
~ENUM1;
~ENUM1[1];
~ENUM1[1], ~ENUM1[2];