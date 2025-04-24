import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import optimize from "../src/optimizer.js"
import generate from "../src/generator.js"

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim()
}

const fixtures = [
  {
    name: "variable declaration and assignment",
    source: `
      const x: integer = 7;
      let change: float = 5.56;
      change = 234.56;
    `,
    expected: dedent`
      let x_1 = 7;
      let change_2 = 5.56;
      change_2 = 234.56;
    `,
  },
  {
    name: "printing math functions",
    source: `
      const twenty_five: integer = 25;
      print(sqrt(twenty_five));
      print(min(2, 3));
      print(max(3, 4));
      print(ln(e));
      print(log10(pi));
      print(floor(10.4342));
      print(arctan(22));
    `,
    expected: dedent`
      let twenty_five_1 = 25;
      console.log(Math.sqrt(twenty_five_1));
      console.log(Math.min(2, 3));
      console.log(Math.max(3, 4));
      console.log(ln(2.718281828459045));
      console.log(log10(3.141592653589793));
      console.log(Math.floor(10.4342));
      console.log(atan(22));
    `,
  },
  {
    name: "objects",
    source: `
      obj new_rectangle = Rectangle(3, 3);
      obj c = Circle(2);
      print(new_rectangle.perimeter());
      obj s = Triangle(5, pow(3, 2), 2);
      print(s.area());
      const x: integer = -7;
      const y: integer = 34;
      obj r = Rectangle(x, y);
      print(r.area());
    `,
    expected: dedent`
      let new_rectangle_1 = {width: 3, height: 3};
      let c_2 = {radius: 2};
      console.log(new_rectangle_1.perimeter());
      let s_3 = {side1: 5, side2: pow(3, 2), side3: 2};
      console.log(s_3.area());
      let x_4 = -(7);
      let y_5 = 34;
      let r_6 = {width: x_4, height: y_5};
      console.log(r_6.area());
    `,
  },
  {
    name: "functions",
    source: `
      fnc addition(a: integer, b: integer): integer = {print(2); return a + b;}
      fnc circleArea(radius: float): float = {return 3.14159 * (radius ** 2);}
      fnc maximum(a: integer, b: integer): integer = {return max(a, b);}
      fnc greeting(name: string): string = {return "Hello, " + name;}
      const x: integer = 7;
      fnc test(): integer = {return x;}
      print(addition(4, 5));
      print(circleArea(pow(3, 2)));
      fnc return_1(): integer = {return 1;}
      print(return_1());
    `,
    expected: dedent`
      function addition_1(a_2, b_3) {
      console.log(2);
      return a_2 + b_3;
      }
      function circleArea_4(radius_5) {
      return 3.14159 * radius_5 ** 2;
      }
      function maximum_6(a_7, b_8) {
      return Math.max(a_7, b_8);
      }
      function greeting_9(name_10) {
      return "Hello, " + name_10;
      }
      let x_11 = 7;
      function test_12() {
      return x_11;
      }
      console.log(addition_1(4, 5));
      console.log(circleArea_4(pow(3, 2)));
      function return_1_13() {
      return 1;
      }
      console.log(return_1_13());
    `,
  },
  {
    name: "while loop",
    source: `
      let sum: integer = 0;
      let counter: integer = 1;

      while true {
          sum = sum + counter;
          if sum > 100 {
              break;
          }
          counter = counter + 1;
      }
    `,
    expected: dedent`
      let sum_1 = 0;
      let counter_2 = 1;
      while (true {
      sum_1 = sum_1 + counter_2;
      if (sum_1 > 100) {
      break;
      }
      counter_2 = counter_2 + 1;
      }
    `,
  },
  {
    name: "if statement",
    source: `
      const x: float = 5.4;
      if x > 3 {print(true);} else if x == 3 {print(2);}
      if x >= 2 {print(x);} else {print(2);}
      if true {print("true");}
    `,
    expected: dedent`
      let x_1 = 5.4;
      if (x_1 > 3) {
      console.log(true);
      } else
      if (x_1 === 3) {
      console.log(2);
      }
      if (x_1 >= 2) {
      console.log(x_1);
      } else {
      console.log(2);
      }
      if (true) {
      console.log("true");
      }
    `,
  },
  {
    name: "derivative",
    source: `
      let d: float = derivative("x^2", "x", 5);
    `,
    expected: dedent`
      let d_1 = derivative("x^2", "x", 5);
    `,
  },
  {
    name: "increment and decrement",
    source: `
      let x: float = 10.3;
      ++x;
      --x;
    `,
    expected: dedent`
      let x_1 = 10.3;
      x_1++;
      x_1--;
    `,
  },
  {
    name: "for loop",
    source: `
      for x in domain(5) { print(x); }
    `,
    expected: dedent`
      for (let x_1 of [0,1,2,3,4]) {
      console.log(x_1);
      }
    `,
  },
  {
    name: "arrays",
    source: `
      let x: integer[] = [1, 2, 3];
      print(#x);
      print(x[0]);
    `,
    expected: dedent`
      let x_1 = [1, 2, 3];
      console.log(#(x_1));
      console.log(x_1[0]);
    `,
  },
  


]

describe("The code generator", () => {
  for (const fixture of fixtures) {
    it(`produces expected js output for the ${fixture.name} program`, () => {
      const actual = generate(optimize(analyze(parse(fixture.source))))
      assert.deepEqual(actual, fixture.expected)
    })
  }
})