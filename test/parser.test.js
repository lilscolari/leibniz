import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"

// Programs expected to be syntactically correct according to Leibniz grammar
const syntaxChecks = [  
  ["test if else", "if x { print(2); }"],
  ["if statement no else", "if true {print(true);}"],
  ["if else", "if true {print(\"in if\");} else {print(\"in else\");}"],
  ["else if", "if true {print(\"ss\");} else if false {print(\"tw\");}"],
  ["if, else if, else", "if x {x=2;} else if x {x=2;} else {x=1;}"],
  ["assignment", "x = 2;"],
  ["variable declaration with type", "let x: integer = 4;"],
  ["const declaration", "const y: boolean = true;"],
  ["function declaration", "fnc add(x: integer, y: integer): integer = x + y;"],
  ["comment", "print(x); // this is a comment"],
  ["arithmetic operations", "print(3 + 3 - 2 * 6 / 2);"],
  ["exponentiation", "print(2 ** 3);"],
  ["negation", "x = -2;"],
  ["numeral with decimal", "x = 2.332132;"],
  ["while loop", "while true { print(1); }"],
  ["break statement", "while true { break; }"],
  ["multiple statements", "let x: integer = 1; print(x); x = 2; print(x);"]
]

// Programs with syntax errors that the parser will detect
const syntaxErrors = [
  ["no semicolon", "let x: integer = 2"],
  ["extra semicolon", "let x: integer = 2;;"],
  ["missing type in var decl", "let x = 4;"],
  ["missing value in var decl", "let x: integer;"],
  ["missing colon in var decl", "let x integer = 4;"],
  ["missing equals in var decl", "let x: integer 4;"],
  ["missing function return type", "fnc add(x: integer, y: integer) = x + y;"],
  ["missing equals in function", "fnc add(x: integer, y: integer): integer x + y;"],
  ["missing parentheses in function params", "fnc add x: integer, y: integer: integer = x + y;"],
  ["no program", ""],
  ["improper comment", "print(x); # this is a comment"],
  ["unclosed string", "print(\"hello;"],
  ["invalid identifier", "let 1x: integer = 4;"],
  ["malformed number", "let x: integer = 2.;"],
  ["printing nothing", "print();"],
  ["assigning nothing", "x = ;"]
]

describe("The parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`matches ${scenario}`, () => {
      const result = parse(source);
      assert(result.succeeded())
    })
  }
  for (const [scenario, source] of syntaxErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => parse(source))
    })
  }
})