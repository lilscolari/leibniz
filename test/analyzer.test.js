import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import * as core from "../src/core.js";

// Helper to parse and analyze a program and return the AST
function getAST(program) {
  const match = parse(program);
  return analyze(match);
}

// Helper to test that the given program succeeds or fails
function checkSuccess(program) {
  assert.doesNotThrow(() => getAST(program));
}

function checkFailure(program, message) {
  assert.throws(() => getAST(program), new RegExp(message ?? ""));
}

// Helper to test that a given program returns a specific AST
function checkAST(program, expected) {
  const actual = getAST(program);
  assert.deepStrictEqual(actual, expected);
}

describe("The analyzer", () => {
  it("throws on variables that are used before they are declared", () => {
    checkFailure("print(x);", "not declared");
  });

  it("throws on variables that are already declared", () => {
    checkFailure("let x: number = 1; let x: number = 2;", "already declared");
  });

  it("throws on assignment to constants", () => {
    checkFailure("const x: number = 1; x = 2;", "immutable");
  });

  it("throws on mismatched types in assignment", () => {
    checkFailure("let x: integer = 1; x = false;", "Cannot assign boolean to integer");
  });

  it("throws on bad types for unary - and !", () => {
    checkFailure("let x: integer = -true;", "Expected number");
    checkFailure("let x: boolean = !5;", "Expected boolean");
  });

  it("throws on bad types for arithmetic operators", () => {
    checkFailure("let x: integer = false + 5;", "Cannot add boolean and integer");
    checkFailure("let x: integer = 5 - false;", "Expected number");
    checkFailure("let x: integer = 5 * false;", "Expected number");
    checkFailure("let x: integer = 5 / false;", "Expected number");
    checkFailure("let x: integer = 5 % false;", "Expected number");
    checkFailure("let x: integer = 5 ** false;", "Expected number");
  });

  it("throws on bad types for relational operators", () => {
    checkFailure("let x: boolean = 5 < false;", "Expected number");
    checkFailure("let x: boolean = 5 <= false;", "Expected number");
    checkFailure("let x: boolean = 5 > false;", "Expected number");
    checkFailure("let x: boolean = 5 >= false;", "Expected number");
  });

  it("passes for equality operators with identical types", () => {
    checkSuccess("let x: boolean = 5 == 5;");
    checkSuccess("let x: boolean = 5 != 5;");
    checkSuccess("let x: boolean = false == false;");
    checkSuccess("let x: boolean = false != false;");
    checkSuccess("let x: boolean = \"hi\" == \"hi\";");
    checkSuccess("let x: boolean = \"hi\" != \"hi\";");
  });

  it("throws on mismatched types for equality operators", () => {
    checkFailure("let x: boolean = 5 == false;", "Type mismatch");
    checkFailure("let x: boolean = 5 != false;", "Type mismatch");
  });

  it("type checks array literals", () => {
    checkSuccess("let x: integer[] = [1, 2, 3];");
    checkSuccess("let x: float[] = [1.0, 2.5, 3.0];");
    checkSuccess("let x: string[] = [\"hi\", \"bye\"];");
    checkSuccess("let x: boolean[] = [true, false];");
    checkFailure("let x: integer[] = [1, \"bye\"];", "All elements must have the same type, found string when expected integer");
    checkFailure("let x: integer[] = [1, true];", "All elements must have the same type, found boolean when expected integer");
  });

  it("allows different numeric types in arrays", () => {
    checkSuccess("let x: number[] = [1, 2.5, 3];");
    checkSuccess("let x: float[] = [1, 2.5];");
  });

  it("throws on mixed types in array literals", () => {
    checkFailure("let x: string[] = [1, \"bye\"];", "have the same type");
  });

  it("handles the # length operator for strings and arrays", () => {
    checkSuccess("let s: string = \"hello\"; let len: integer = #s;");
    checkSuccess("let a: integer[] = [1, 2, 3]; let len: integer = #a;");
    checkFailure("let x: integer = 5; let len: integer = #x;", "Expected string or array");
    checkFailure("let b: boolean = true; let len: integer = #b;", "Expected string or array");
  });

  it("type checks function calls", () => {
    checkSuccess("fnc f(x: integer): integer = { return x; } let y: integer = f(1);");
    checkFailure("fnc f(x: integer): integer = { return x; } let y: integer = f(true);", "Cannot assign boolean to integer");
    checkFailure("fnc f(x: integer): integer = { return x; } let y: string = f(1);", "Cannot assign integer to string");
  });

  it("handles function bodies with return", () => {
    checkSuccess(`
      fnc add(x: integer, y: integer): integer = {
        let z: integer = x + y;
        return z;
      }
    `);
  });

  it("type checks if statements", () => {
    checkSuccess("if (true) { print(1); }");
    checkFailure("if (1) { print(1); }", "Expected boolean");
  });

  it("type checks while statements", () => {
    checkSuccess("while (true) { print(1); }");
    checkFailure("while (1) { print(1); }", "Expected boolean");
  });

  it("validates for loops with different domain arguments", () => {
    checkSuccess("for i in domain(5) { print(i); }");
    checkSuccess("for i in domain(1, 5) { print(i); }");
    checkSuccess("for i in domain(1, 10, 2) { print(i); }");
    
    checkFailure("for i in domain() { print(i); }", "domain\\(\\) requires 1 to 3 arguments, got 0");
    checkFailure("for i in domain(1, 2, 3, 4) { print(i); }", "domain\\(\\) requires 1 to 3 arguments, got 4");
    checkFailure("for i in domain(true) { print(i); }", "Expected integer");
    checkFailure("for i in domain(1, true) { print(i); }", "Expected integer");
    checkFailure("for i in domain(1, 5, false) { print(i); }", "Expected integer");
  });

  it("type checks object creation", () => {
    checkSuccess("obj t = Triangle(3, 4, 5);");
    checkSuccess("obj r = Rectangle(10, 20);");
    checkSuccess("obj c = Circle(5);");
    checkFailure("obj t = Triangle(abs(-4), 4);", "Triangle requires 3 arguments");
    checkFailure("obj t = Triangle(3, 4, true);", "Expected number");
    checkFailure("obj r = Rectangle(10, true);", "Expected number");
  });

  it("validates method calls", () => {
    checkSuccess("obj t = Triangle(3, 4, 5); let a: float = t.area();");
    checkSuccess("obj r = Rectangle(10, 20); let p: float = r.perimeter();");
    checkSuccess("obj c = Circle(5); let a: float = c.area();");
    checkSuccess("obj c = Circle(5); let r: float = c.radius();");
    checkFailure("obj t = Triangle(3, 4, 5); let a: float = t.volume();", "Method volume not defined for Triangle objects");
  });

  it("validates array subscripting", () => {
    checkSuccess("let a: integer[] = [1, 2, 3]; let x: integer = a[0];");
    checkFailure("let a: integer[] = [1, 2, 3]; let x: integer = a[true];", "Expected number");
    checkSuccess("let s: string = \"hello\"; let c: string = s[0];");
    checkSuccess("let a: boolean[] = [];");
  });

  it("validates ++ and -- operators", () => {
    checkSuccess("let x: integer = 5; ++x;");
    checkSuccess("let x: integer = 5; --x;");
    checkFailure("let x: boolean = true; ++x;", "Expected number");
    checkFailure("let x: boolean = true; --x;", "Expected number");
  });

  it("validates derivative functions", () => {
    checkSuccess("let d: float = derivative(\"x^2\", \"x\", 2.0);");
    checkFailure("let d: float = derivative(5, \"x\", 2.0);", "Expected string");
    checkFailure("let d: float = derivative(\"x^2\", 5, 2.0);", "Expected string");
    checkFailure("let d: float = derivative(\"x^2\", \"x\", true);", "Expected number");
  });

  it("validates math constants", () => {
    checkSuccess("let p: float = pi;");
    checkSuccess("let e_val: float = e;");
    checkSuccess("let pi_sym: float = π;");
  });

  it("validates type coercion in numeric contexts", () => {
    checkSuccess("let x: number = 5;");
    checkSuccess("let x: number = 5.5;");
    checkSuccess("let x: float = 5;");
    checkFailure("let x: integer = 5.5;", "Cannot assign float to integer");
  });

  it("recognizes array types in return statements", () => {
    checkSuccess("fnc getArray(): integer[] = { return [1, 2, 3]; }");
    checkFailure("fnc getArray(): string[] = { return [1, 2, 3]; }", "Cannot assign integer to string");
  });

  it("allows concatenation of strings", () => {
    checkSuccess("let s: string = \"hello\" + \" world\";");
    checkFailure("let s: string = \"hello\" + 5;", "Cannot add string and integer");
  });

  it("creates correct ASTs for the # length operator", () => {
    const ast = getAST("const s: string = \"hello\"; let len: integer = #s;");
    assert.strictEqual(ast.statements[1].initializer.kind, "UnaryExpression");
    assert.strictEqual(ast.statements[1].initializer.op, "#");
    assert.strictEqual(ast.statements[1].initializer.type, "integer");
  });
});