import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";

describe("The analyzer", () => {
  // Variable declarations
  describe("Variable declarations", () => {
    it("recognizes variable declarations with different types", () => {
      const source = `
        let i: integer = 42;
        const f: float = 3.14;
        let n: number = 2.5;
        const b: boolean = false;
        let s: string = "hello";
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes numeric type compatibility", () => {
      const source = `
        let f: float = 42;       // integer to float
        let n: number = 42;      // integer to number
        let n2: number = 3.14;   // float to number
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("handles numeric type across multiple values", () => {
      const source = `
        let x: integer = 5;
        let y: float = x + 1.5;
        let z: number = x * y;
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("throws on type mismatch in declarations", () => {
      const source = "let x: integer = 3.14;";
      assert.throws(() => analyze(parse(source)), /Cannot assign float to integer/);
    });
    
    it("throws on variable redeclaration", () => {
      const source = "let x: integer = 1; let x: integer = 2;";
      assert.throws(() => analyze(parse(source)), /Variable already declared: x/);
    });
  });
  
  // Function declarations
  describe("Function declarations", () => {
    it("recognizes function with parameters", () => {
      const source = "fnc add(x: integer, y: integer): integer = x + y;";
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes function with no parameters", () => {
      const source = "fnc zero(): integer = 42;";
      assert.ok(analyze(parse(source)));
    });
    
    
    
    it("throws on type mismatch in return", () => {
      const source = "fnc f(): boolean = 5;";
      assert.throws(() => analyze(parse(source)), /Cannot assign integer to boolean/);
    });
  });
  
  // Control flow
  describe("Control flow", () => {
    it("recognizes if statements", () => {
      const source = `
        if true { print(1); } else { print(2); }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes if statements with no else", () => {
      const source = "if true { print(1); }";
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes else-if chains", () => {
      const source = `
        if true { 
          print(1); 
        } else if false { 
          print(2); 
        } else { 
          print(3); 
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes while loops", () => {
      const source = `
        let i: integer = 0;
        while i < 10 {
          i = i + 1;
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes break in loops", () => {
      const source = `
        let i: integer = 0;
        while true {
          if i > 10 { break; }
          i = i + 1;
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("handles complex nested conditions", () => {
      const source = `
        let x: integer = 10;
        let y: integer = 20;
        if x > 5 {
          if y > 15 {
            print(1);
          } else {
            print(2);
          }
        } else {
          print(3);
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("throws on non-boolean condition in if", () => {
      const source = "if 1 { print(1); }";
      assert.throws(() => analyze(parse(source)), /Expected boolean/);
    });
    
    it("throws on non-boolean condition in while", () => {
      const source = "while 1 { print(1); }";
      assert.throws(() => analyze(parse(source)), /Expected boolean/);
    });
  });
  
  // Expressions
  describe("Expressions", () => {
    // Binary operations
    it("recognizes arithmetic operations", () => {
      const source = `
        let a: integer = 1 + 2;
        let b: integer = 3 - 4;
        let c: integer = 5 * 6;
        let d: float = 7 / 8;
        let e: integer = 9 % 10;
        let f: float = 2 ** 3;
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes comparison operations", () => {
      const source = `
        let a: boolean = 1 < 2;
        let b: boolean = 3 <= 4;
        let c: boolean = 5 > 6;
        let d: boolean = 7 >= 8;
        let e: boolean = 9 == 10;
        let f: boolean = 11 != 12;
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes string operations", () => {
      const source = `
        let a: string = "hello" + " world";
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("handles complex arithmetic expressions", () => {
      const source = `
        let x: float = 2.0 * (3.0 + 4.0) / 5.0 - 6.0 ** 2.0 % 7.0;
        print(x);
      `;
      assert.ok(analyze(parse(source)));
    });
    
    // Unary operations
    it("recognizes unary operations", () => {
      const source = `
        let a: integer = -5;
        let b: boolean = !false;
      `;
      assert.ok(analyze(parse(source)));
    });
    
    // Math functions
    it("recognizes trigonometric functions", () => {
      const source = `
        let a: float = sin(0.5);
        let b: float = cos(0.5);
        let c: float = tan(0.5);
        let d: float = arcsin(0.5);
        let e: float = arccos(0.5);
        let f: float = arctan(0.5);
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes unary math functions", () => {
      const source = `
        let a: float = sqrt(4);
        let b: float = exp(1);
        let c: float = ln(2);
        let d: float = log10(100);
        let e: integer = abs(-5);
        let f: integer = floor(3.7);
        let g: integer = ceil(3.2);
        let h: integer = round(3.5);
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes binary math functions", () => {
      const source = `
        let a: integer = min(5, 3);
        let b: integer = max(5, 3);
        let c: float = pow(2, 3);
      `;
      assert.ok(analyze(parse(source)));
    });
    
    // Type errors in expressions
    it("throws on incompatible operands for addition", () => {
      const source = 'let x: string = "hello" + 5;';
      assert.throws(() => analyze(parse(source)), /Cannot add string and integer/);
    });
    
    it("throws on non-numeric operands for arithmetic", () => {
      const source = "let x: integer = true + 5;";
      assert.throws(() => analyze(parse(source)), /Cannot add boolean and integer/);
    });
    
    it("throws on incompatible comparison", () => {
      const source = 'let x: boolean = 5 == "hello";';
      assert.throws(() => analyze(parse(source)), /Type mismatch/);
    });
  });
  
  // Assignment and increment
  describe("Assignment and increment", () => {
    it("recognizes assignment to mutable variable", () => {
      const source = "let x: integer = 1; x = 2;";
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes increment", () => {
      const source = "let x: integer = 1; ++x;";
      assert.ok(analyze(parse(source)));
    });
    
    it("throws on assignment to immutable variable", () => {
      const source = "const x: integer = 1; x = 2;";
      assert.throws(() => analyze(parse(source)), /Assignment to immutable variable/);
    });
    
    it("throws on incompatible assignment", () => {
      const source = "let x: integer = 1; x = true;";
      assert.throws(() => analyze(parse(source)), /Cannot assign boolean to integer/);
    });
    
    it("throws on increment of non-numeric variable", () => {
      const source = "let x: boolean = false; ++x;";
      assert.throws(() => analyze(parse(source)), /Expected number/);
    });
  });
  
  // Print statements
  describe("Print statements", () => {
    it("recognizes print with different types", () => {
      const source = `
        print(42);
        print(3.14);
        print(true);
        print("hello");
      `;
      assert.ok(analyze(parse(source)));
    });
  });
  
  // Scoping
  describe("Scoping", () => {
    it("recognizes variable shadowing", () => {
      const source = `
        let x: integer = 10;
        while true {
          let x: boolean = true;
          print(x);
          break;
        }
        print(x);
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes accessing outer variable", () => {
      const source = `
        let x: integer = 10;
        while true {
          print(x);
          break;
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("handles deeply nested scopes", () => {
      const source = `
        let x: integer = 1;
        while true {
          let y: integer = 2;
          if true {
            let z: integer = 3;
            print(x + y + z);
          }
          break;
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("throws on undefined variable", () => {
      const source = "print(x);";
      assert.throws(() => analyze(parse(source)), /x not declared/);
    });
  });
});