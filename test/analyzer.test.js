import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"
import { flatten } from "../src/analyzer.js"
import analyze from "../src/analyzer.js"
import { 
    program, 
    printStatement, 
    ifStatement, 
    variable, 
    variableDeclaration, 
    assignmentStatement, 
    binaryExpression, 
    incrementStatement, 
    intType,
    functionDeclaration, 
    func, 
    forStatement, 
    Triangle, 
    Circle, 
    Rectangle 
  } from "../src/core.js";
  
// Programs that are semantically correct
const semanticChecks = [
  ["variable declarations", 'let x = 1; let y = "false";'],
  ["long if", "if true {print(1);} else {print(3);}"],
  ["elsif", "if true {print(1);} else if true {print(0);} else {print(3);}"],
  ["for over collection", "for i in domain(5) {print(1);}"],
  ["comment after print", "print(true); // comment"],
  ["relations", 'print(1<=2);'],
  ["arithmetic", "print(2*3+5-3/2-5%8);"],
  ["outer variable", "let x=1;  if (false) {print(x);}"],
  ["built-in sqrt", "print(sin(25.0));"],
  ["built-in sin", "print(sin(π));"],
  ["built-in cos", "print(cos(93.999));"],
  ["built-in tan", "print(tan(5));"],
  ["built-in log", "print(log(2));"],
  ["built-in abs", "print(abs(-5));"],
  ["built-in ceil", "print(ceil(323.323));"],
  ["built-in floor", "print(floor(232.68));"],
  ["circle creation", "obj c = Circle(d);"],
  ["rectangle creation", "obj new_rect = Rectangle(l, 5);"],
  ["triangle creation", "obj new_triangle = Triangle(4, 5);"],
  ["area call on triangle", "obj new_triangle = Triangle(3, 2); print(new_triangle.area());"],
  ["perimeter call on triangle", "obj new_triangle = Triangle(3, 2); print(new_triangle.perimeter());"],
  ["decimal number", "print(213.3);"],
  ["float scientific number (no sign)", "print(3213.31E10);"],
  ["float scientific number (+ sign)", "print(3213.31E+10);"],
  ["float scientific number2 (- sign)", "print(3213.31E-10);"],
  ["scientific number (no sign)", "print(321331E10);"],
  ["scientific number (+ sign)", "print(321331E+10);"],
  ["scientific number2 (- sign)", "print(321331E-10);"],
  ["valid method 'area' for Circle", "obj new_circle = Circle(3); let y = new_circle.area();"],
  ["valid method 'circumference' for Circle", "obj new_circle = Circle(4); let x = new_circle.circumference();"],
  ["valid math constant pi", "print(pi);"],  
  ["valid math constant e", "print(e);"],  
  ["valid math constant π", "print(π);"],  
  ["string literal", "print(\"test\");"],
  ["assignment statement", "let x = 2; x = 4;"],
  ["nested if else", "if true {let x2 = 4;} else if false {print(true);} else {let in_the_else = 7;}"],
  ["perimeter function on rectangle", "obj new_rect = Rectangle(6, 5); print(new_rect.perimeter());"],
  ["area function on rectangle", "obj new_rect = Rectangle(6, 5); print(new_rect.area());"],
  ["negative number", "let neg = -3;"],
  ["primary parentheses", "let this = (3 + 4) * 2;"],
  ["not equal check on strings", "let yes = (\"test\" != \"3.4\");"],
  ["increment", "let inc = 5; ++inc;"],
  ["exponent", "let x = 2 ** 7;"],
  ["calling user func", "func add(x, y) { return 2; } print(add(3, 4));"],
  ["test", "func subtract(hi, dude) {let none = 3;none = 2;return none;}"],
  ["checks that cos() can call sin(x)", "print(cos(sin(x)));"],
  ["do not evaluate derivative", "print(derivative(\"x^2\", \"x\"));"],
  ["evaluate derivative", "print(derivative(\"x^2\", \"x\", 3));"]

  

]

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  ["string comparison", 'print("x" > "y");', /Expected number/],
  ["built-in constants", "print(25.0 * π);", /Expected number or string/],
  ["operands not same type", "let x = π + 2.2;", /Operands must have the same type/],
  ["relation not number", "print(3.5<1.2);", /Expected number/],
  ["call method for undefined object", "print(new_triangle.area());", /Error: Object new_triangle not found./],
  ["one argument to rectangle", "obj new_rect = Rectangle(5);", /Error: Rectangle requires exactly 2 arguments \(base, height\), but got 1\./],
  ["invalid method for Circle", "obj circle = Circle(2); let x = circle.diameter();", /Error: diameter is not a valid method for Circle./],
  ["unknown object type", "obj unknown = Square(5);", /Expected "Circle", "Rectangle", or "Triangle"/],
  ["invalid method for Rectangle", "obj rectangle = Rectangle(2, 3); let x = rectangle.circumference();", /Error: circumference is not a valid method for Rectangle./],
  ["invalid print argument", "print(π + \"text\");", /Operands must have the same type/],
  ["assignment to undeclared variable", "x = 10;", /x not declared/],
  ["undeclared function call", "let result = unknownFunction(5);", /TypeError: Cannot read properties of undefined \(reading \'type\'\)/],
  ["invalid binary operation", "let result = true + 5;", /Expected number or string/],
  ["constructor call with wrong arguments", "obj rect = Rectangle();", /Error: Rectangle requires exactly 2 arguments \(base, height\), but got 0\./],
  ["calling method on non-object", "let x = 5.area();", /Expected a digit/],
  ["undefined method on object", "obj triangle = Triangle(3,4); let p = triangle.volume();", /Error: volume is not a valid method for Triangle./],
  ["assigning new type", "let x = 2; x = \"dog\";", /Operands must have the same type/],
  ["too many arguments for Circle", "obj circle = Circle(2, 3);", /Error: Circle requires exactly 1 argument \(radius\), but got 2\./],
  ["calling unknown object", "print(unknown.circumference());", /Error: Object unknown not found./],
  ["equality check on different types", "let does_it_work = (4 == 3.4);", /Type mismatch/],
  ["sin call no arguments", "let x = sin();", /Error: Function sin expects 1 argument\(s\), but received 0\./],
  ["loop over non-digit", "for y in domain(dog) {print(2);}", /Expected a digit/],
  ["not a valid number for derivative", "print(derivative(\"x^2\", \"x\", \"test\"));", /Error: The third argument \(value\) must be a valid number \(int or float\)./]
];

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)))
    })
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern)
    })
  }
  // it("produces the expected representation for a trivial program", () => {
  //   assert.deepEqual(
  //       analyze(parse("let x = 2.2;")),
  //       program([
  //       variableDeclaration(
  //         variable("x", floatType, 2.2),
  //       ),
  //     ])
  //   )
  // })
})

describe('flatten', () => {
  it('should flatten an array with multiple levels of nesting', () => {
    const input = [1, [2, 3], [4, [5, 6]]];
    const expected = [1, 2, 3, 4, 5, 6];
    assert.deepEqual(flatten(input), expected);
  });

  it('should return an empty array if input is empty', () => {
    const input = [];
    const expected = [];
    assert.deepEqual(flatten(input), expected);
  });

  it('should return the same array if no nesting', () => {
    const input = [1, 2, 3];
    const expected = [1, 2, 3];
    assert.deepEqual(flatten(input), expected);
  });

  it('should handle an array with only one level of nesting', () => {
    const input = [1, [2], 3];
    const expected = [1, 2, 3];
    assert.deepEqual(flatten(input), expected);
  });

  it('should handle deeply nested arrays', () => {
    const input = [1, [2, [3, [4, 5]]]];
    const expected = [1, 2, 3, 4, 5];
    assert.deepEqual(flatten(input), expected);
  });

  it('should handle arrays with mixed types', () => {
    const input = [1, 'hello', [2, 3], [4, 'world']];
    const expected = [1, 'hello', 2, 3, 4, 'world'];
    assert.deepEqual(flatten(input), expected);
  });
});
