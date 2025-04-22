import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import * as core from "../src/core.js";

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
      const source = `
        fnc add(x: integer, y: integer): integer = {
          return x + y;
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes function with no parameters", () => {
      const source = `
        fnc zero(): integer = {
          return 42;
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes function with local variables", () => {
      const source = `
        fnc double(x: integer): integer = {
          let y: integer = x * 2;
          return y;
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("throws on type mismatch in return", () => {
      const source = `
        fnc f(): boolean = {
          return 5;
        }
      `;
      assert.throws(() => analyze(parse(source)), /Cannot assign integer to boolean/);
    });
  });

  // Derivatives
  describe("Derivatives", () => {
    it("recognizes derivatives", () => {
      const source = `
        print(derivative("x^2", "x", 231.4));
        print(derivative("x^2", "x", 231));
      `;
      assert.ok(analyze(parse(source)));
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
    
    it("throws on break outside of loop", () => {
      const source = "break;";
      assert.throws(() => analyze(parse(source)), /Break statement must be inside a loop/);
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
        let x: number = 5;
        let y: number = 2;
        let g: boolean = x == y;
        let h: boolean = "s" == "i";
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
    
    // Math constants
    it("recognizes math constants", () => {
      const source = `
        print(pi);
        print(e);
        print(π);
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
  
  // Assignment, increment and decrement
  describe("Assignment, increment and decrement", () => {
    it("recognizes assignment to mutable variable", () => {
      const source = "let x: integer = 1; x = 2;";
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes increment", () => {
      const source = "let x: integer = 1; ++x;";
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes decrement", () => {
      const source = "let x: integer = 1; --x;";
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
    
    it("throws on decrement of non-numeric variable", () => {
      const source = "let x: boolean = false; --x;";
      assert.throws(() => analyze(parse(source)), /Expected number/);
    });
  });
  
  // For loops
  describe("For loops", () => {
    it("recognizes basic for loop", () => {
      const source = `
        for x in domain(5) {
          print(x);
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes break in for loop", () => {
      const source = `
        for i in domain(10) {
          if i > 5 { 
            break; 
          }
          print(i);
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes for loop with complex body", () => {
      const source = `
        for i in domain(3) {
          let x: integer = i * 2;
          print(x);
        }
      `;
      assert.ok(analyze(parse(source)));
    });
  });
  
  // Objects
  describe("Objects", () => {
    it("recognizes object creation and method calls", () => {
      const source = `
        obj r = Rectangle(5, 3);
        obj c = Circle(2);
        obj t = Triangle(4, 6);
        
        print(r.area());
        print(r.perimeter());
        print(c.area());
        print(c.circumference());
        print(t.area());
        print(t.perimeter());
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes objects used with math functions", () => {
      const source = `
        obj r = Rectangle(3, floor(3.45));
        obj c = Circle(sqrt(2));
        obj t = Triangle(5, pow(3, 2));
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("throws on invalid method for Circle", () => {
      const source = `
        obj c = Circle(5);
        print(c.perimeter());
      `;
      assert.throws(() => analyze(parse(source)), /perimeter is not a valid method for Circle/);
    });
    
    it("throws on invalid method for Rectangle", () => {
      const source = `
        obj r = Rectangle(5, 3);
        print(r.circumference());
      `;
      assert.throws(() => analyze(parse(source)), /circumference is not a valid method for Rectangle/);
    });
    
    it("throws on wrong argument count for Circle", () => {
      const source = `
        obj c = Circle(5, 3);
      `;
      assert.throws(() => analyze(parse(source)), /Circle requires exactly 1 argument/);
    });
    
    it("throws on wrong argument count for Rectangle", () => {
      const source = `
        obj r = Rectangle(5);
      `;
      assert.throws(() => analyze(parse(source)), /Rectangle requires exactly 2 arguments/);
    });
    
    it("throws on undeclared object", () => {
      const source = `
        print(r.area());
      `;
      assert.throws(() => analyze(parse(source)), /r not declared/);
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
    
    it("recognizes print with complex expressions", () => {
      const source = `
        print(2 + 3 * 4);
        print(sin(0.5) + cos(0.5));
      `;
      assert.ok(analyze(parse(source)));
    });
  });
  
  // Function calls
  describe("Function calls", () => {
    it("recognizes function calls in expressions", () => {
      const source = `
        fnc add(x: integer, y: integer): integer = {
          return x + y;
        }
        
        let z: integer = add(5, 3) * 2;
        print(z);
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("recognizes nested function calls", () => {
      const source = `
        fnc square(x: integer): integer = {
          return x * x;
        }
        
        fnc sum(a: integer, b: integer): integer = {
          return a + b;
        }
        
        print(sum(square(3), square(4)));
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("throws on wrong argument count", () => {
      const source = `
        fnc add(x: integer, y: integer): integer = {
          return x + y;
        }
        
        print(add(1));
      `;
      assert.throws(() => analyze(parse(source)), /Expected 2 arguments but got 1/);
    });
    
    it("throws on wrong argument type", () => {
      const source = `
        fnc add(x: integer, y: integer): integer = {
          return x + y;
        }
        
        print(add(1, true));
      `;
      assert.throws(() => analyze(parse(source)), /Cannot assign boolean to integer/);
    });
    
    it("throws on call to non-existent function", () => {
      const source = `
        print(foo(1, 2));
      `;
      assert.throws(() => analyze(parse(source)), /foo not declared/);
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
    
    it("handles function parameter shadowing", () => {
      const source = `
        let x: integer = 10;
        fnc f(x: integer): integer = {
          return x * 2;  // Uses parameter x, not outer x
        }
        print(x);        // Uses outer x
        print(f(5));     // Passes 5 as x to f
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("throws on undefined variable", () => {
      const source = "print(x);";
      assert.throws(() => analyze(parse(source)), /x not declared/);
    });
  });

  // Additional tests for coverage
  describe("Edge cases for context handling", () => {
    it("handles context inheritance in nested loops", () => {
      const source = `
        while true {
          for i in domain(3) {
            if i > 1 { break; }
            print(i);
          }
          break;
        }
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("handles complex nested contexts with shadowing", () => {
      const source = `
        let x: integer = 1;
        if true {
          let x: string = "hello";
          print(x);
        }
        print(x);
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("tests parent context lookup", () => {
      const source = `
        let outer: integer = 10;
        if true {
          let inner: integer = 5;
          print(outer + inner);
        }
      `;
      assert.ok(analyze(parse(source)));
    });
  });

  describe("Type coercion edge cases", () => {
    it("handles all numeric type combinations", () => {
      const source = `
        let i: integer = 1;
        let f: float = 2.5;
        let n: number = 3;
        
        let r1: float = i + f;    // integer + float → float
        let r2: number = i + n;   // integer + number → number
        let r3: number = f + n;   // float + number → number
        let r4: float = i / i;    // integer / integer → float
        let r5: integer = i % i;  // integer % integer → integer
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("tests all comparison cases", () => {
      const source = `
        let a: integer = 1;
        let b: float = 2.5;
        let s1: string = "hello";
        let s2: string = "world";
        
        let r1: boolean = a == a;
        let r2: boolean = a != a;
        let r3: boolean = a < b;
        let r4: boolean = a <= b;
        let r5: boolean = a > b;
        let r6: boolean = a >= b;
        let r7: boolean = s1 == s2;
        let r8: boolean = s1 != s2;
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("tests incompatible type error scenarios", () => {
      const source = `
        let i: integer = 1;
        let b: boolean = true;
      `;
      assert.ok(analyze(parse(source)));
      
      // Test incompatible numeric assignments
      assert.throws(() => {
        analyze(parse("let f: float = true;"));
      }, /Cannot assign boolean to float/);
      
      // Test incompatible string operations
      assert.throws(() => {
        analyze(parse('let s: string = "hello" + 5;'));
      }, /Cannot add string and integer/);
    });
  });

  describe("String handling", () => {
    it("tests string operations and methods", () => {
      const source = `
        let s1: string = "hello";
        let s2: string = "world";
        let s3: string = s1 + " " + s2;
        print(s3);
      `;
      assert.ok(analyze(parse(source)));
    });
  });

  describe("Array and object edge cases", () => {
    it("tests object creation with complex expressions", () => {
      const source = `
        let radius: float = sqrt(2);
        obj circle = Circle(radius);
        
        let base: integer = 3;
        let height: float = 4.5;
        obj triangle = Triangle(base, height);
        
        print(circle.area());
        print(triangle.area());
      `;
      assert.ok(analyze(parse(source)));
    });
    
    it("tests null check for alternate in if statement", () => {
      const source = `
        if true {
          print(1);
        }  // No else clause to test null alternate
      `;
      assert.ok(analyze(parse(source)));
    });
  });
  
  // Core.js specific tests
  describe("Core module tests", () => {
    it("throws on invalid binary expression arguments", () => {
      assert.throws(() => {
        core.binaryExpression(null, { type: "integer" }, { type: "integer" }, "integer");
      }, /Invalid arguments for binary expression/);
      
      assert.throws(() => {
        core.binaryExpression("+", null, { type: "integer" }, "integer");
      }, /Invalid arguments for binary expression/);
      
      assert.throws(() => {
        core.binaryExpression("+", { type: "integer" }, null, "integer");
      }, /Invalid arguments for binary expression/);
      
      assert.throws(() => {
        core.binaryExpression("+", { type: "integer" }, { type: "integer" }, null);
      }, /Invalid arguments for binary expression/);
    });
  });
});