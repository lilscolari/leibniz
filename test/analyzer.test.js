import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"
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
    typeDeclaration, 
    booleanType, 
    intType, 
    floatType, 
    scientificType, 
    stringType, 
    field, 
    functionDeclaration, 
    func, 
    intrinsicFunction, 
    functionType, 
    increment, 
    decrement, 
    assignment, 
    returnStatement, 
    shortIfStatement, 
    forStatement, 
    conditional, 
    constructorCall, 
    standardLibrary, 
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
  ["decimal number", "print(213.3);"],
  ["scientific number (no sign)", "print(3213.31E10);"],
  ["scientific number (+ sign)", "print(3213.31E+10);"],
  ["scientific number2 (- sign)", "print(3213.31E-10);"],
  ["valid method 'area' for Circle", "obj new_circle = Circle(3); let y = new_circle.area();"],
  ["valid method 'circumference' for Circle", "obj new_circle = Circle(4); let x = new_circle.circumference();"]

]

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  ["string comparison", 'print("x" > "y");', /Expected number/],
  ["built-in constants", "print(25.0 * π);", /Expected number or string/],
  ["operands not same type", "let x = π + 2.2;", /Operands must have the same type/],
  ["relation not number", "print(3.5<1.2);", /Expected number/],
  ["call method for undefined object", "print(new_triangle.area());", /Error: Object new_triangle not found./],
  ["one argument to rectangle", "obj new_rect = Rectangle(5);", /Error: Rectangle requires exactly 2 arguments \(base, height\), but got 1\./],
  ["invalid method for Circle", "obj circle = Circle(2); let x = circle.diameter();", /Error: diameter is not a valid method for Circle./]
  //["'circumference' for Circle no args", "obj circle = Circle(); let x = circle.circumference();", /Error: Circle requires exactly 1 argument\(radius\), but got 0\./]
  
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
//   it("produces the expected representation for a trivial program", () => {
//     assert.deepEqual(
//       analyze(parse("let x = π + 2.2;")),
//       program([
//         variableDeclaration(
//           variable("x", true, floatType),
//           binary("+", variable("π", false, floatType), 2.2, floatType)
//         ),
//       ])
//     )
//   })
})