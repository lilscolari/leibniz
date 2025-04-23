# leibniz

![leibniz logo](https://github.com/lilscolari/leibniz/blob/main/docs/leibniz_logo.png)
<br>
** original model generated using Dall-E 3.0 and edited using PhotoShop
<br>
<br>
Here is a link to the GitHub Pages Site: https://lilscolari.github.io/leibniz/
<br>
<br>
Leibniz is a math-focused programming language created by Cameron, Atul, Doug, and Artur. Inspired by our shared passion for mathematics, we set out to build a language that makes mathematical computation more intuitive, expressive, and accessible. Our goal is to enable users to seamlessly integrate powerful mathematical tools into their code, improving both readability and functionality.
<br>
<br>
The language is named after Gottfried Wilhelm Leibniz, one of the inventors of calculus and the mind behind the Leibniz calculator—one of the earliest machines capable of performing all four basic arithmetic operations. His contributions to math and logic align closely with the goals of our language, making the name a perfect fit.
<br>
<br>
## Examples of static errors
| Example |
| ------- |
| Expected number |
| Expected a digit |
| Type mismatch |
| Expected number or string |
| Operands must have the same type |
| x not declared |
| Error: Object new_triangle not found. |
| Expected "Circle", "Rectangle", or "Triangle" |
| Error: Rectangle requires exactly 2 arguments (base, height), but got 1. |
| Error: Triangle requires exactly 2 arguments (base, height), but got 1. |
| Error: Rectangle requires exactly 2 arguments (base, height), but got 0. |
| Error: Triangle requires exactly 2 arguments (base, height), but got 0. |
| Error: Circle requires exactly 1 argument (radius), but got 2. |
| Error: diameter is not a valid method for Circle. |
| Error: circumference is not a valid method for Rectangle. |
| TypeError: Cannot read properties of undefined (reading 'type') |
| Error: volume is not a valid method for Triangle. |
| Error: Function sin expects 1 argument(s), but received 0 |


<br>
<br>

## Features of the language
| Feature    | Explanation |
| -------- | ------- |
| reserved words  |  to allow for easy integration of mathematical terminology   |
| optionals | safer handling of missing values |
| dynamically typed    | better for algebraic manipulation    |
| semicolons | to mark the end of a line |
| trig functions | to allow more mathematic versatility |
| shapes | to expand to geometry |
| vectors | to serve as lists and vectors in math |
| equations | data type to allow users to create their own equations which act like functions |
| error handling | for mathematical errors like division by zero |
| immutability | to ensure values do not change |
| pattern matching | useful when working with symbols and variables |
| auto-simplification | to make math problems less complex |


<br>
<br>

## Potential example programs

| leibniz    |
| -------- |
| deriv(y: x^2+6x, Optional[val:2]) = 10  |
| integrate(y: 3x^2+5x, Optional[a,b]) = x^3+(5/2)x^2+c |
| eval(2cos(x)-1); |
| arctan(1, output: degrees) = 45 |
| Triangle.area(b:5,h:8) = 20 |
| f(x, y) = {x * y;} |
| for (_ in domain(0, 100, Optional[step])) {} |
| distance(5m, 3s, output: mph) |
| eq = x^2 + 6x; deriv(eq, x=2); |
