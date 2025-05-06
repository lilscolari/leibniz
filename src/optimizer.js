// The optimizer module exports a single function, optimize(node), to perform
// machine-independent optimizations on the analyzed semantic representation.
//
// The only optimizations supported here are:
//
//   - assignments to self (x = x) turn into no-ops
//   - constant folding
//   - some strength reductions (+0, -0, *0, *1, etc.)
//   - turn references to built-ins true and false to be literals
//   - remove all disjuncts in || list after literal true
//   - remove all conjuncts in && list after literal false
//   - while-false becomes a no-op
//   - repeat-0 is a no-op
//   - for-loop over empty array is a no-op
//   - for-loop with low > high is a no-op
//   - if-true and if-false reduce to only the taken arm
//
// The optimizer also replaces token references with their actual values,
// since the original token line and column numbers are no longer needed.
// This simplifies code generation.

import * as core from "./core.js"

export default function optimize(node) {
  return optimizers?.[node.kind]?.(node) ?? node
}

const isZero = n => n === 0 || n === 0n
const isOne = n => n === 1 || n === 1n

const optimizers = {
  Program(p) {
    p.statements = p.statements.flatMap(optimize)
    return p
  },
  VariableDeclaration(d) {
    d.variable = optimize(d.variable)
    d.initializer = optimize(d.initializer)
    return d
  },
  FunctionDeclaration(d) {
    d.fun = optimize(d.fun)
    return d
  },
  Function(f) {
    if (f.body) f.body = f.body.flatMap(optimize)
    return f
  },
  IncrementStatement(s) {
    s.variable = optimize(s.variable)
    return s
  },
  DecrementStatement(s) {
    s.variable = optimize(s.variable)
    return s
  },
  AssignmentStatement(s) {
    s.source = optimize(s.source)
    s.target = optimize(s.target)
    if (s.source === s.target) {
      return []
    }
    return s
  },
  BreakStatement(s) {
    return s
  },
  ReturnStatement(s) {
    s.expression = optimize(s.expression)
    return s
  },
  IfStatement(s) {
    s.test = optimize(s.test)
    s.consequent = s.consequent.flatMap(optimize)
    if (s.alternate?.kind?.endsWith?.("IfStatement")) {
      s.alternate = optimize(s.alternate)
    } else {
      s.alternate = s.alternate.flatMap(optimize)
    }
    if (s.test.constructor === Boolean) {
      return s.test ? s.consequent : s.alternate
    }
    return s
  },
  WhileStatement(s) {
    s.test = optimize(s.test)
    if (s.test.value === false) {
      // while false is a no-op
      return []
    }
    s.body = s.body.statements.flatMap(optimize)
    return s
  },
  ForLoopStatement(s) {
    s.loopVar = optimize(s.loopVar)
    s.start = optimize(s.start)
    s.stop = optimize(s.stop)
    s.step = optimize(s.step)
    s.body = s.body.statements.flatMap(optimize)
    return s
  },
  BinaryExpression(e) {
    e.op = optimize(e.op)
    e.left = optimize(e.left)
    e.right = optimize(e.right)

    if (e.left && e.right && e.left.value !== undefined && e.right.value !== undefined) {
      let resultValue;
      let resultType;
    
      if (e.op === "+") {
        resultValue = e.left.value + e.right.value;
      } else if (e.op === "-") {
        resultValue = e.left.value - e.right.value;
      } else if (e.op === "*") {
        resultValue = e.left.value * e.right.value;
      } else if (e.op === "/") {
        resultValue = e.left.value / e.right.value;
      } else if (e.op === "**") {
        resultValue = e.left.value ** e.right.value;
      } else if (e.op === "<") {
        resultValue = e.left.value < e.right.value;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === "<=") {
        resultValue = e.left.value <= e.right.value;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === "==") {
        resultValue = e.left.value === e.right.value;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === "!=") {
        resultValue = e.left.value !== e.right.value;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === ">=") {
        resultValue = e.left.value >= e.right.value;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === ">") {
        resultValue = e.left.value > e.right.value;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === "%") {
        resultValue = e.left.value % e.right.value;
      }
    
      resultType = (Number.isInteger(resultValue)) ? 'integer' : 'float';
    
      return { type: resultType, value: resultValue };
    }
  
    return e;
  },
  UnaryExpression(e) {
    e.op = optimize(e.op);
    e.operand = optimize(e.operand);
  
    if (typeof e.operand.value === "number") {
      if (e.op === "-") {
        return {
          type: Number.isInteger(-e.operand.value) ? "integer" : "float",
          value: -e.operand.value
        };
      }
    }
  
    return e;
  },
  SubscriptExpression(e) {
    e.array = optimize(e.array)
    e.index = optimize(e.index)
    return e
  },
  ArrayExpression(e) {
    e.elements = e.elements.map(optimize)
    return e
  },
  MemberExpression(e) {
    e.object = optimize(e.object)
    return e
  },
  FunctionCall(c) {
    c.callee = optimize(c.callee)
    c.args = c.args.map(optimize)
    return c
  },
  ConstructorCall(c) {
    c.callee = optimize(c.callee)
    c.args = c.args.map(optimize)
    return c
  },
  PrintStatement(s) {
    s.argument = optimize(s.argument)
    return s
  },
  // NOT YET IMPLEMENTED:
  FunctionBody(s) {
    return s
  },
  ObjectCreation(s) {
    return s
  },
  MethodCall(s) {
    return s
  },
  MapOrFilterCall(s) {
    return s
  },
  MatrixSubscriptExpression(s) {
    return s
  },
  CallExpression(s) {
    return s
  },
  Block(s) {
    return s;
  },
  IntegerLiteral(s) {
    return s;
  },
  MatrixExpression(s) {
    s.rows = s.rows.flatMap(optimize)
    return s;
  }
}