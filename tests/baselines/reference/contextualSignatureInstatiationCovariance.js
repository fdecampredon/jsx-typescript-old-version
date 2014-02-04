var f2;

var g2;
g2 = f2; // While neither Animal nor TallThing satisfy the constraint, T is at worst a Giraffe and compatible with both via covariance.

var h2;
h2 = f2; // Animal does not satisfy the constraint, but T is at worst a Giraffe and compatible with Animal via covariance.
