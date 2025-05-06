import { describe, it } from "node:test"
import assert from "node:assert/strict"
import optimize from "../src/optimizer.js"
import * as core from "../src/core.js"

// Make some test cases easier to read
// const i = core.variable("x", true, core.intType)
// const x = core.variable("x", true, core.floatType)
// const a = core.variable("a", true, core.arrayType(core.intType))
// const return1p1 = core.returnStatement(core.binary("+", 1, 1, core.intType))
// const return2 = core.returnStatement(2)
// const returnX = core.returnStatement(x)
// const onePlusTwo = core.binary("+", 1, 2, core.intType)
// const aParam = core.variable("a", false, core.anyType)
// const anyToAny = core.functionType([core.anyType], core.anyType)
// const identity = Object.assign(core.fun("id", [aParam], [returnX], anyToAny))
// const voidInt = core.functionType([], core.intType)
// const intFun = body => core.fun("f", [], body, voidInt)
// const intFunDecl = body => core.functionDeclaration(intFun(body))
// const callIdentity = args => core.functionCall(identity, args)
// const or = (...d) => d.reduce((x, y) => core.binary("||", x, y))
// const and = (...c) => c.reduce((x, y) => core.binary("&&", x, y))
// const less = (x, y) => core.binary("<", x, y)
// const eq = (x, y) => core.binary("==", x, y)
// const times = (x, y) => core.binary("*", x, y)
// const neg = x => core.unary("-", x)
// const array = (...elements) => core.arrayExpression(elements)
// const assign = (v, e) => core.assignment(v, e)
// const sub = (a, e) => core.subscript(a, e)
// const unwrapElse = (o, e) => core.binary("??", o, e)
// const emptyOptional = core.emptyOptional(core.intType)
// const some = x => core.unary("some", x)

const x = { kind: 'IntegerLiteral', type: 'integer', value: 5 };
const y = { kind: 'IntegerLiteral', type: 'integer', value: 8 };
const f = { kind: 'FloatLiteral', type: 'float', value: 8 };
const zero = { king: 'IntegerLiteral', type: 'integer', value: 0 };
const one = { king: 'IntegerLiteral', type: 'integer', value: 1 };
const neg = x => core.unaryExpression("-", x, 'integer');
const program = core.program;
const xpp = core.incrementStatement(x);
const xmm = core.decrementStatement(x);
const emptyArray = [];
const printStatement = core.printStatement(x);
const breakStatement = core.breakStatement();
const block = core.block([printStatement, breakStatement]);
const variable = core.variable('v', 'integer', 'true');
const a = { kind: 'IntegerLiteral', type: 'integer', value: 4 };
const b = { kind: 'IntegerLiteral', type: 'integer', value: 5 };
const c = { kind: 'IntegerLiteral', type: 'integer', value: 6 };
const array = core.variableDeclaration(core.variable('x', 'integer[]', true), core.arrayExpression([4, 5, 6], 'integer[]'));
const printArray = core.printStatement(core.subscriptExpression(array, 2 + 3, 'integer'));
const trueValue = { type: 'boolean', value: true };
const falseValue = { type: 'boolean', value: false };
const makeVar = core.variableDeclaration(core.variable('x', 'integer', true), { kind: 'IntegerLiteral', type: 'integer', value: 5 })
const assignVar = core.assignmentStatement({ kind: 'IntegerLiteral', type: 'integer', value: 5 }, core.variable('x', 'integer', true))
const printStatement2 = core.binaryExpression('+', { kind: 'IntegerLiteral', type: 'integer', value: 4 }, core.variable("x", "integer", true), 'integer');
const nine = { type: 'integer',value: 9 };


const tests = [
  ["removes same assignment", program([makeVar, assignVar]), program([makeVar])],
  ["adds 4 + x", program([makeVar, printStatement2]), program([makeVar, nine])],
  ["folds +", core.binaryExpression("+", x, y, "integer"), 13],
  ["folds -", core.binaryExpression("-", x, y, "integer"), -3],
  ["folds *", core.binaryExpression("*", x, y, "integer"), 40],
  ["folds /", core.binaryExpression("/", x, y, "integer"), 0.625],
  ["folds **", core.binaryExpression("**", x, y, "integer"), 390625],
  ["folds %", core.binaryExpression("%", x, y, "integer"), 5],
  ["folds <", core.binaryExpression("<", x, y, "boolean"), true],
  ["folds <=", core.binaryExpression("<=", x, y, "boolean"), true],
  ["folds ==", core.binaryExpression("==", x, y, "boolean"), false],
  ["folds !=", core.binaryExpression("!=", x, y, "boolean"), true],
  ["folds >=", core.binaryExpression(">=", x, y, "boolean"), false],
  ["folds >", core.binaryExpression(">", x, y, "boolean"), false],
  ["optimizes +0", core.binaryExpression("+", x, zero, "integer"), x],
  ["optimizes -0", core.binaryExpression("-", x, zero, "integer"), x],
  ["optimizes *1 for floats", core.binaryExpression("*", x, one, "integer"), x],
  ["optimizes /1", core.binaryExpression("/", x, one, "integer"), x],
  ["optimizes *0", core.binaryExpression("*", x, zero, "integer"), 0],
  ["optimizes 0*", core.binaryExpression("*", zero, x, "integer"), 0],
  ["optimizes 0/", core.binaryExpression("/", zero, x, "integer"), 0],
  ["optimizes 0+ for floats", core.binaryExpression("+", zero, x, "integer"), x],
  ["optimizes 0-", core.binaryExpression("-", zero, x, "integer"), neg(x)],
  ["optimizes 1*", core.binaryExpression("*", one, x), x],
  ["folds negation on int", core.unaryExpression("-", y), -8],
  ["folds negation on float", core.unaryExpression("-", f), -8],
  ["optimizes 1** for floats", core.binaryExpression("**", one, x), 1],
  ["optimizes **0", core.binaryExpression("**", x, zero), 1],
  ["removes x=x at beginning", program([core.assignmentStatement(x, x), x]), program([x])],
  ["removes x=x at end", program([x, core.assignmentStatement(x, x)]), program([x])],
  ["removes x=x in middle", program([x, core.assignmentStatement(x, x), x]), program([x, x])],
  ["optimizes if-true", core.ifStatement(trueValue, [x], []), [x]],
  ["optimizes if-false", core.ifStatement(falseValue, [], [x]), [x]],
  ["optimizes if-false with no alternate", core.ifStatement(falseValue, [], []), []],
  ["optimizes while-false", program([core.whileStatement(falseValue, block)]), program([])],
  ["optimizes for-empty-array", core.forLoopStatement(x, 0, 0, 0, block), []],
]

describe("The optimizer", () => {
  for (const [scenario, before, after] of tests) {
    const optimizedBefore = optimize(before);
    const optimizedAfter = optimize(after);

    console.log(optimizedBefore)
    console.log(optimizedAfter)
    it(`${scenario}`, () => {
      const optimizedValueBefore = optimizedBefore?.value !== undefined ? optimizedBefore.value : optimizedBefore;
      const optimizedValueAfter = optimizedAfter?.value !== undefined ? optimizedAfter.value : optimizedAfter;
      assert.deepEqual(optimizedValueBefore, optimizedValueAfter)
    })
  }
})
