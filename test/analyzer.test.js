import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";

// Programs that are semantically correct
const semanticChecks = [
  ["variable declarations", 'let x: integer = 1; let y: string = "false";'],
  ["vardecl with types", 'let x: number = 1; let y: string = "false";'],
  ["complex array types", "fnc f(x: number[][]): integer = 3;"],
  ["increment", "let x: integer = 10; ++x;"],
  ["initialize with empty array", "let a: integer[] = [];"],
  ["assign arrays", "let a: integer[] = [1,2,3]; let b: integer[] = [10,20]; a = b; b = a;"],
  ["assign to array element", "let a: integer[] = [1,2,3]; a[1] = 100;"],
  ["simple break", "while true { break; }"],
  ["break in nested if", "while false { if true { break; } }"],
  ["long if", "if true { print(1); } else { print(3); }"],
  ["elsif", "if true { print(1); } else if true { print(0); } else { print(3); }"],
  ["relations", "print(1 <= 2); print(1 > 2);"],
  ["ok to == arrays", "print([1] == [5,8]);"],
  ["ok to != arrays", "print([1] != [5,8]);"],
  ["arithmetic", "let x: integer = 1; print(2*3+5**-3/2-5%8);"],
  ["array length", "print(#[1,2,3]);"],
  ["variables", "let x: integer[][] = [[[[1]]]]; print(x[0][0][0][0]+2);"],
  ["subscript exp", "let a: integer[] = [1,2]; print(a[0]);"],
  ["simple calls", "print(1);"],
  ["type equivalence of nested arrays", "fnc f(x: number[][]): integer = 3; print(f([[1],[2]]));"],
  ["outer variable", "let x: integer = 1; while(false) { print(x); }"],
  ["trig functions", "print(sin(0.5)); print(cos(0.5)); print(tan(0.5));"],
  ["inverse trig functions", "print(arcsin(0.5)); print(arccos(0.5)); print(arctan(0.5));"],
  ["unary math functions", "print(sqrt(4)); print(exp(1)); print(ln(2)); print(log10(100));"],
  ["more unary math functions", "print(abs(-5)); print(floor(3.7)); print(ceil(3.2)); print(round(3.5));"],
  ["binary math functions", "print(min(5, 10)); print(max(5, 10)); print(pow(2, 3));"],
  ["numeric type coercion", "let x: float = 5; let y: integer = 10; print(x + y);"],
  ["string concatenation", 'let a: string = "Hello"; let b: string = "World"; print(a + b);'],
  ["array with mixed numeric types", "let a: float[] = [1, 2.5, 3];"],
];

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  ["non-number increment", "let x: boolean = false; ++x;", /Expected number/],
  ["undeclared id", "print(x);", /x not declared/],
  ["redeclared id", "let x: integer = 1; let x: integer = 1;", /Variable already declared/],
  ["assign to const", "const x: integer = 1; x = 2;", /Assignment to immutable variable/],
  ["assign to function", "fnc f(): integer = 3; fnc g(): integer = 5; f = g;", /Assignment to immutable variable/],
  ["assign to const array element", "const a: integer[] = [1]; a[0] = 2;", /Assignment to immutable variable/],
  ["assign bad type", "let x: integer = 1; x = true;", /Cannot assign/],
  ["assign bad array type", "let x: integer = 1; x = [true];", /Cannot assign/],
  ["break outside loop", "break;", /Break/],
  ["non-boolean short if test", "if 1 {}", /Expected boolean/],
  ["non-boolean if test", "if 1 {} else {}", /Expected boolean/],
  ["non-boolean while test", "while 1 {}", /Expected boolean/],
  ["bad types for +", "print(false + 1);", /Cannot add/],
  ["bad types for -", "print(false - 1);", /Expected number/],
  ["bad types for *", "print(false * 1);", /Expected number/],
  ["bad types for /", "print(false / 1);", /Expected number/],
  ["bad types for **", "print(false ** 1);", /Expected number/],
  ["bad types for <", "print(false < 1);", /Expected number/],
  ["bad types for <=", "print(false <= 1);", /Expected number/],
  ["bad types for >", "print(false > 1);", /Expected number/],
  ["bad types for >=", "print(false >= 1);", /Expected number/],
  ["bad types for ==", 'print(2 == "x");', /Type mismatch/],
  ["bad types for !=", "print(false != 1);", /Type mismatch/],
  ["bad types for negation", "print(-true);", /Expected number/],
  ["bad types for length", "print(#false);", /Expected string or array/],
  ["bad types for not", 'print(!"hello");', /Expected boolean/],
  ["non-number index", "let a: integer[] = [1]; print(a[false]);", /Expected number/],
  ["diff type array elements", "print([3,false]);", /All elements must have the same type/],
  ["call of non-function", "let x: integer = 1; print(x());", /not a function/],
  ["too many args", "fnc f(x: integer): integer = 3; print(f(1,2));", /argument/],
  ["too few args", "fnc f(x: integer): integer = 3; print(f());", /argument/],
  ["parameter type mismatch", "fnc f(x: integer): integer = 3; print(f(false));", /Cannot assign/],
  ["non-number arg to trig function", "print(sin(true));", /Expected number/],
  ["non-number arg to unary math function", "print(sqrt(false));", /Expected number/],
  ["non-number args to binary math function", "print(min(false, 5));", /Expected number/],
  ["incompatible return type", "fnc f(): integer = 3.5;", /Cannot assign/],
  ["string and number addition", 'print("hello" + 5);', /Cannot add/],
];

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)));
    });
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern);
    });
  }
});