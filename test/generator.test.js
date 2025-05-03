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
      const math = require('mathjs');
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
      print(min([2, 3]));
      print(max([3, 4]));
      print(ln(e));
      print(log10(pi));
      print(floor(10.4342));
      print(arctan(22));
    `,
    expected: dedent`
      const math = require('mathjs');
      let twenty_five_1 = 25;
      console.log(Math.sqrt(twenty_five_1));
      console.log(math.min([2, 3]));
      console.log(math.max([3, 4]));
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
      obj t = Triangle(5, 5, 2);
      print(t);
      obj t2 = Triangle(5, 5, 5);
      print(t2);
    `,
    expected: dedent`
      const math = require('mathjs');
      let new_rectangle_1 = {width: 3, height: 3, area: function() {return 9}, perimeter: function() {return 12}};
      let c_2 = {radius: 2, area: function() {return 12.566370614359172}, circumference: function() {return 12.566370614359172}};
      console.log(new_rectangle_1.perimeter());
      let s_3 = {side1: 5, side2: NaN, side3: 2, area: function() {return "sorry no functionality for area of triangle yet"}, perimeter: function() {return NaN}, type: function() {return Scalene}};
      console.log(s_3.area());
      let t_4 = {side1: 5, side2: 5, side3: 2, area: function() {return "sorry no functionality for area of triangle yet"}, perimeter: function() {return 12}, type: function() {return Isosceles}};
      console.log(t_4);
      let t2_5 = {side1: 5, side2: 5, side3: 5, area: function() {return "sorry no functionality for area of triangle yet"}, perimeter: function() {return 15}, type: function() {return Equilateral}};
      console.log(t2_5);
    `,
  },
  {
    name: "functions",
    source: `
      fnc addition(a: integer, b: integer): integer = {print(2); return a + b;}
      fnc circleArea(radius: float): float = {return 3.14159 * (radius ** 2);}
      fnc greeting(name: string): string = {return "Hello, " + name;}
      const x: integer = 7;
      fnc test(): integer = {return x;}
      print(addition(4, 5));
      print(circleArea(pow(3, 2)));
      fnc return_1(): integer = {return 1;}
      print(return_1());
    `,
    expected: dedent`
      const math = require('mathjs');
      function addition_1(a_2, b_3) {
      console.log(2);
      return a_2 + b_3;
      }
      function circleArea_4(radius_5) {
      return 3.14159 * radius_5 ** 2;
      }
      function greeting_6(name_7) {
      return "Hello, " + name_7;
      }
      let x_8 = 7;
      function test_9() {
      return x_8;
      }
      console.log(addition_1(4, 5));
      console.log(circleArea_4(Math.pow(3, 2)));
      function return_1_10() {
      return 1;
      }
      console.log(return_1_10());
          `,
  },
  {
    name: "while loop",
    source: `
      let total: integer = 0;
      let counter: integer = 1;

      while true {
          total = total + counter;
          if total > 100 {
              break;
          }
          counter = counter + 1;
      }
    `,
    expected: dedent`
      const math = require('mathjs');
      let total_1 = 0;
      let counter_2 = 1;
      while (true) {
      total_1 = total_1 + counter_2;
      if (total_1 > 100) {
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
      const math = require('mathjs');
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
      const math = require('mathjs');
      let d_1 = math.derivative("x^2", "x").evaluate({x: 5});
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
      const math = require('mathjs');
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
      const math = require('mathjs');
      for (let x_1 = 0; x_1 < 5; x_1 += 1) {
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
      const math = require('mathjs');
      let x_1 = [1, 2, 3];
      console.log(x_1.length);
      console.log(x_1[0]);
    `,
  },
  {
    name: "more arrays",
    source: `
      let x: integer[] = [3, 2, 1, 10, 4, 3, 6];

      print(sort(x));
      print(mean(x));
      print(median(x));
      print(mode(x));
      print(min(x));
      print(max(x));
      print(prod(x));
      print(sum(x));
      print(std(x));
      print(variance(x));

      let sorted: integer[] = sort(x);

      for x in domain(#sorted) {
          sorted[x] = 1;
          print(sorted[x]);
      }

      print(sorted);

      sorted[3] = 10;

      print(sorted[5] * 3);

      print(sorted);
    `,
    expected: dedent`
      const math = require('mathjs');
      let x_1 = [3, 2, 1, 10, 4, 3, 6];
      console.log(math.sort(x_1));
      console.log(math.mean(x_1));
      console.log(math.median(x_1));
      console.log(math.mode(x_1)[0]);
      console.log(math.min(x_1));
      console.log(math.max(x_1));
      console.log(math.prod(x_1));
      console.log(math.sum(x_1));
      console.log(math.std(x_1));
      console.log(math.variance(x_1));
      let sorted_2 = math.sort(x_1);
      for (let x_3 = 0; x_3 < sorted_2.length; x_3 += 1) {
      sorted_2[x_3] = 1;
      console.log(sorted_2[x_3]);
      }
      console.log(sorted_2);
      sorted_2[3] = 10;
      console.log(sorted_2[5] * 3);
      console.log(sorted_2);
    `,
  },
  {
    name: "matrices",
    source: `
      let threeby3: matrix = [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1]];

      print(column(threeby3, 1));
      print(count(threeby3));
      print(count("test"));
      threeby3[1][1] = 5;
      print(threeby3);
      print(cross([1, 1, 0], [0, 1, 1]));
      print(det([[1, 2], [3, 4]]));
      print(diag([1, 2, 3]));
      const a_matrix: matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
      print(diag(a_matrix));
      print(dot([1, 2, 3], [2, 3, 4]));
      print(eigs([[1, 0], [0, 1]]));
      print(identity(4));
      print(inv([[1, 2], [3, 4]]));
      print(ones(7));
      print(zeros(8));
      print(arange(5, 10));
      print(transpose([[1, 2, 3], [4, 5, 6]]));
      print(shape([[1, 2, 3], [4, 5, 6]]));
    `,
    expected: dedent`
      const math = require('mathjs');
      let threeby3_1 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      console.log(math.column(threeby3_1, 1));
      console.log(math.count(threeby3_1));
      console.log(math.count("test"));
      threeby3_1[1][1] = 5;
      console.log(threeby3_1);
      console.log(math.cross([1, 1, 0], [0, 1, 1]));
      console.log(math.det([[1, 2], [3, 4]]));
      console.log(math.diag([1, 2, 3]));
      let a_matrix_2 = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
      console.log(math.diag(a_matrix_2));
      console.log(math.dot([1, 2, 3], [2, 3, 4]));
      console.log(math.eigs([[1, 0], [0, 1]]).values);
      console.log(math.identity(4)._data);
      console.log(math.inv([[1, 2], [3, 4]]));
      console.log(math.ones(7)._data);
      console.log(math.zeros(8)._data);
      console.log(math.range(5, 10)._data);
      console.log(math.transpose([[1, 2, 3], [4, 5, 6]]));
      console.log(math.size([[1, 2, 3], [4, 5, 6]]));
    `,
  },
  {
    name: "other cool math stuff",
    source: `
      print(zeta(3));

      const ITERATIONS: integer = 100;

      let a: integer[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      for i in domain(ITERATIONS) {
          print(arandom(a));
      }

      print(choose(7, 5));
      print(perm(5, 3));

      for i in domain(ITERATIONS) {
          print(rand(0, 100));
          print(randint(0, 100));
      }
    `,
    expected: dedent`
      const math = require('mathjs');
      console.log(math.zeta(3));
      let ITERATIONS_1 = 100;
      let a_2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      for (let i_3 = 0; i_3 < ITERATIONS_1; i_3 += 1) {
      console.log(math.pickRandom(a_2));
      }
      console.log(math.combinations(7, 5));
      console.log(math.permutations(5, 3));
      for (let i_4 = 0; i_4 < ITERATIONS_1; i_4 += 1) {
      console.log(math.random(0, 100));
      console.log(math.randomInt(0, 100));
}
    `,
  },
  {
    name: "convert to string",
    source: `
      print(str(5));
    `,
    expected: dedent`
      const math = require('mathjs');
      console.log(5.toString());
    `,
  },
  {
    name: "map and filter",
    source: `
      fnc greater_than_2(i: integer): boolean = {
          if i > 2 {
              return true;
          }
          return false;
      }

      fnc multiply_by_2(i: integer): integer = {
          return i * 2;
      }

      let test: integer[] = [1, 2, 3, 4, 5, 6, 7];

      let name: integer[] = test.filter(x: integer => greater_than_2);
      let name2: integer[] = test.map(x: integer => multiply_by_2);

      print(name);
      print(name2);

      let name3: integer[] = test.filter(greater_than_2);
      print(name3);
    `,
    expected: dedent`
      const math = require('mathjs');
      function greater_than_2_1(i_2) {
      if (i_2 > 2) {
      return true;
      }
      return false;
      }
      function multiply_by_2_3(i_4) {
      return i_4 * 2;
      }
      let test_5 = [1, 2, 3, 4, 5, 6, 7];
      let name_6 = test_5.filter(x => greater_than_2_1(x));
      let name2_7 = test_5.map(x => multiply_by_2_3(x));
      console.log(name_6);
      console.log(name2_7);
      let name3_8 = test_5.filter(x => greater_than_2_1(x));
      console.log(name3_8);
    `,
  },
  {
    name: "convert to string",
    source: `
      print(!true);
    `,
    expected: dedent`
      const math = require('mathjs');
      console.log(!(true));
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

describe("generator", () => {
  it("returns an empty string for null input", () => {
    const result = generate(null);
    assert.equal(result, "const math = require('mathjs');");
  });
});