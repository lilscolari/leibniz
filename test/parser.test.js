import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"

// Programs expected to be syntactically correct
const syntaxChecks = [  
  ["test if else", "if x { print(2); }"],
  ["test for loop with statement in block", "for x in domain(2) {print(2);}"],
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
  ["conditional", "print(4 < 6);"],
  ["function call", "x = arccos(2, 3);"],
  ["function creation", "func add(x, y) {print(x + y);}"],
  ["comment", "print(x); // this is a comment"],
  ["addition", "print(3 + 3);"],
  ["subtraction", "print(3 - 2);"],
  ["division", "print(6 / 2);"],
  ["multiplication", "print(2 * 2);"],
  ["exponentiation", "print(2 ** 3);"],
  ["negation", "x = -2;"],
  ["numeral with decimal", "x = 2.332132;"],
  ["numeral with exponent", "if (x < 2) {x = 2E10;} else {x = 2e-10;}"]
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
  ["bad function call", "x = blob(x, y);"],
  ["bad function creation", "func add(x, y) {}"],
  ["improper comment", "print(x); # this is a comment"],
  ["factorial", "x = 10!;"],
  ["only a comment", "// a comment"],
  ["addition expression only", "x+y;"],
  ["improper exponential number", "x = 10ex20;"],
  ["equality check but not a statement", "x == 2;"],
  ["for loop with non numeral passed to domain", "for x in domain(d) {print(x);}"],
  ["improper arguments passed to domain", "for g in domain(2, 3) {print(2);}"],
  ["printing nothing", "print();"],
  ["assigning nothing", "x = ;"],
  ["malformed number", "let x= 2.;"],
  ["non operator", "print(7 * ((2 _ 3));"]
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