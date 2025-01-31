# leibniz

![leibniz logo](https://github.com/lilscolari/leibniz/blob/main/docs/leibniz_logo.png)

This is the repository for the leibniz programming language created by Cameron, Atul, Doug, and Artur. Our shared interest in math prompted us to want to make a programming language that supported better math functionality and allowed users to easily integrate important mathematical tools within their code to improve readability and functionality. The Leibniz calculator was the first calculator that could perform all four basic arithmetic operations so what better name to choose for our language than that. Also, Gottfried Wilhelm Leibniz was one of the creators of calculus, a mathematical field that introduces various symbols and concepts that we hope to include in our language. We hope that our language can allow people to better enjoy math and make math easier to use for people who may struggle at it.
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

