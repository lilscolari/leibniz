import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"

// Programs expected to be syntactically correct
const syntaxChecks = [  
  ["test if else", "if x { print(2); }"],
  ["test for loop with statement in block", "for 2 in domain(2) {print(2);}"],
  ["cosine function call", "x = cos(4, 3);"],
  ["creating circle object", "obj id = Circle;"],
  ["calling circumference on circle", "x = Circle.circumference(3, 2);"],
  ["calling perimeter on triangle", "x = Triangle.perimeter(3, 2);"],
  ["if statement no else", "if true {print(true);}"],
  ["if else", "if true {print(\"in if\");} else {print(\"in else\");}"],
  ["else if", "if true {print(\"ss\");} else if false {print(\"tw\");}"],
  ["assignment", "x = 2;"],
  ["variable declaration", "let x = 4;"],
  ["if, else if, else", "if x {x=2;} else if x {x=2;} else {x=1;}"],
  ["conditional", ""],
  ["function call", ""],
  ["function creation", ""],
  ["comment", ""],
  ["addition", ""],
  ["subtraction", ""],
  ["division", ""],
  ["multiplication", ""],
  ["exponentiation", ""],
  ["negation", ""],
  ["numeral with decimal", ""],
  ["numeral with exponent", ""]
]

// Programs with syntax errors that the parser will detect
const syntaxErrors = [
  ["test for loop with no statement in block", "for 2 in domain(2) {}"],
  ["cosine function call with no arguments", "x = cos();"],
  ["creating object named 'let'", "obj let = Circle;"],
  ["calling circumference on square", "x = Square.circumference(3, 2);"],
  ["calling area on square with no args", "x = Square.area();"],
  ["else statement alone", "else {x=false;}"],
  ["no semicolon", "let x = 2"],
  ["extra semicolon", "let x = 2;;"],
  ["assignment to keyword", "for = true;"],
  ["no program", ""],
  ["bad function call", ""],
  ["bad function creation", ""],
  ["improper comment", ""],
  ["factorial", ""]
]

describe("The parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`matches ${scenario}`, () => {
      assert(parse(source).succeeded())
    })
  }
  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => parse(source), errorMessagePattern)
    })
  }
})