import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";

describe("The parser", () => {
  it("matches test if else", () => {
    assert.ok(parse("if true { print(1); } else { print(2); }"));
  });

  it("matches if statement no else", () => {
    assert.ok(parse("if true { print(1); }"));
  });

  it("matches if else", () => {
    assert.ok(parse("if true { print(1); } else { print(2); }"));
  });

  it("matches else if", () => {
    assert.ok(parse("if true { print(1); } else if false { print(2); }"));
  });

  it("matches if, else if, else", () => {
    assert.ok(
      parse(`if true { 
        print(1); 
      } else if false { 
        print(2); 
      } else { 
        print(3); 
      }`)
    );
  });

  it("matches assignment", () => {
    assert.ok(parse("x = 1;"));
  });

  it("matches variable declaration with type", () => {
    assert.ok(parse("let x: integer = 1;"));
  });

  it("matches const declaration", () => {
    assert.ok(parse("const x: integer = 1;"));
  });

  it("matches function declaration", () => {
    assert.ok(parse("fnc add(x: integer, y: integer): integer = { return x + y; }"));
  });
  
  it("matches void function declaration", () => {
    assert.ok(parse("fnc printOnly(x: integer): void = { print(x); }"));
    assert.ok(parse("fnc noReturn(): void = { }"));
    assert.ok(parse("fnc emptyReturn(): void = { return; }"));
  });

  it("matches comment", () => {
    assert.ok(parse("let x: integer = 1; // hello world"));
  });

  it("matches arithmetic operations", () => {
    assert.ok(parse("x = 1 + 2 * 3 / 4 - 5;"));
  });

  it("matches exponentiation", () => {
    assert.ok(parse("x = 2 ** 3;"));
  });

  it("matches negation", () => {
    assert.ok(parse("x = -y;"));
  });

  it("matches numeral with decimal", () => {
    assert.ok(parse("pi_approximation = 3.14159;"));
  });

  it("matches while loop", () => {
    assert.ok(parse("while x < 10 { x = x + 1; }"));
  });

  it("matches break statement", () => {
    assert.ok(parse("break;"));
  });

  it("matches multiple statements", () => {
    assert.ok(
      parse(`
        let x: integer = 1;
        let y: integer = 2;
        let z: integer = x + y;
        print(z);
      `)
    );
  });

  it("matches for loop with different domain argument counts", () => {
    assert.ok(
      parse(`
        for i in domain(5) {
          print(i);
        }
      `)
    );
    
    assert.ok(
      parse(`
        for i in domain(1, 5) {
          print(i);
        }
      `)
    );
    
    assert.ok(
      parse(`
        for i in domain(1, 10, 2) {
          print(i);
        }
      `)
    );
  });
  
  it("matches array indexing and assignment", () => {
    assert.ok(parse("let a: integer[] = [1, 2, 3]; let x: integer = a[0];"));
    assert.ok(parse("let a: integer[] = [1, 2, 3]; a[0] = 5;"));
  });
  
  it("matches array map and filter operations", () => {
    assert.ok(parse("let a: integer[] = [1, 2, 3]; let b: integer[] = a.map(x: integer => x * 2);"));
    assert.ok(parse("let a: integer[] = [1, 2, 3]; let b: integer[] = a.filter(x: integer => x > 1);"));
    assert.ok(parse("let a: integer[] = [1, 2, 3]; let b: integer[] = a.filter(x > 1);"));
  });

  it("matches object creation", () => {
    assert.ok(
      parse(`
        obj r = Rectangle(5, 3);
        obj c = Circle(2);
        obj t = Triangle(4, 6, 8);
      `)
    );
  });

  it("matches object method calls", () => {
    assert.ok(
      parse(`
        obj r = Rectangle(5, 3);
        print(r.area());
        print(r.perimeter());
      `)
    );
  });

  it("matches math constants", () => {
    assert.ok(
      parse(`
        print(pi);
        print(e);
        print(π);
      `)
    );
  });

  it("throws on no semicolon", () => {
    assert.throws(() => parse("x = 1"));
  });

  it("throws on extra semicolon", () => {
    assert.throws(() => parse("x = 1;;"));
  });

  it("throws on missing type in var decl", () => {
    assert.throws(() => parse("let x = 1;"));
  });

  it("throws on missing value in var decl", () => {
    assert.throws(() => parse("let x: integer;"));
  });

  it("throws on missing colon in var decl", () => {
    assert.throws(() => parse("let x integer = 1;"));
  });

  it("throws on missing equals in var decl", () => {
    assert.throws(() => parse("let x: integer 1;"));
  });

  it("throws on missing function return type", () => {
    assert.throws(() => parse("fnc add(x: integer, y: integer) = { return x + y; }"));
  });

  it("throws on missing equals in function", () => {
    assert.throws(() => parse("fnc add(x: integer, y: integer): integer { return x + y; }"));
  });

  it("throws on missing parentheses in function params", () => {
    assert.throws(() => parse("fnc add: integer = { return 42; }"));
  });

  it("throws on missing return statement in function", () => {
    assert.throws(() => parse("fnc add(x: integer, y: integer): integer = { x + y; }"));
  });

  it("throws on missing curly braces in function body", () => {
    assert.throws(() => parse("fnc add(x: integer, y: integer): integer = return x + y;"));
  });

  it("throws on no program", () => {
    assert.throws(() => parse(""));
  });

  it("throws on improper comment", () => {
    assert.throws(() => parse("/ hello"));
  });

  it("throws on unclosed string", () => {
    assert.throws(() => parse('let s: string = "hello;'));
  });

  it("throws on invalid identifier", () => {
    assert.throws(() => parse("let if: integer = 1;"));
  });

  it("throws on malformed number", () => {
    assert.throws(() => parse("x = 1.;"));
  });

  it("throws on printing nothing", () => {
    assert.throws(() => parse("print();"));
  });

  it("throws on assigning nothing", () => {
    assert.throws(() => parse("x = ;"));
  });
});