import * as core from "./core.js"

export default function optimize(node) {
  return optimizers?.[node.kind]?.(node) ?? node
}

const lastAssignedValue = Object.create(null);

const optimizers = {
  Program(p) {
    p.statements = p.statements.flatMap(optimize)
    return p
  },
  VariableDeclaration(d) {
    d.variable = optimize(d.variable)
    d.initializer = optimize(d.initializer)
    lastAssignedValue[d.variable.name] = { value: d.initializer.value, type: d.initializer.type };
    return d
  },
  FunctionDeclaration(d) {
    d.fun = optimize(d.fun)
    d.body = optimize(d.body)
    return d
  },
  Function(f) {
    f.parameters = f.parameters.flatMap(optimize)
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

    if (s.target.kind === "Variable" && s.source?.value !== undefined) {
      const name = s.target.name;
      const last = lastAssignedValue[name];
  
      if (last && last.value === s.source.value && last.type === s.source.type) {
        return [];
      }
      lastAssignedValue[name] = { value: s.source.value, type: s.source.type };
    }

    if (s.source.value === s.target.value && s.source.value !== undefined) {
      return [];
    }
  
    return s;
  },
  BreakStatement(s) {
    return s
  },
  ReturnStatement(s) {
    s.expression = optimize(s.expression)
    return s
  },
  IfStatement(s) {
    s.test = optimize(s.test);
           
    if (s.test.value === true) {
      return optimize(s.consequent);
    } else if (s.alternate !== null) {
      return optimize(s.alternate);
    } else {
      return s;
    }
  },
  WhileStatement(s) {
    s.test = optimize(s.test)
    if (s.test.value === false) {
      return []
    }
    return s
  },
  ForLoopStatement(s) {
    s.loopVar = optimize(s.loopVar)
    s.start = optimize(s.start)
    s.stop = optimize(s.stop)
    s.step = optimize(s.step)
    s.body = s.body.statements.flatMap(optimize)
    if (s.stop.value === s.start.value) {
      return []
    }
    return s
  },
  BinaryExpression(e) {
    e.op = optimize(e.op)
    e.left = optimize(e.left)
    e.right = optimize(e.right)
    let leftValue, rightValue;

    if (e.left.kind === "Variable") {
      if (lastAssignedValue[e.left.name]) {
        leftValue = lastAssignedValue[e.left.name].value
      } else {
        leftValue = e.left.value
      }
    } else {
      leftValue = e.left.value
    }

    if (e.right.kind === "Variable") {
      if (lastAssignedValue[e.right.name]) {
        rightValue = lastAssignedValue[e.right.name].value
      } else {
        rightValue = e.right.value
      }
    } else {
      rightValue = e.right.value
    }

    if (e.left && e.right && leftValue !== undefined && rightValue !== undefined) {
      let resultValue;
      let resultType;
    
      if (e.op === "+") {
        resultValue = leftValue + rightValue;
      } else if (e.op === "-") {
        resultValue = leftValue - rightValue;
      } else if (e.op === "*") {
        resultValue = leftValue * rightValue;
      } else if (e.op === "/") {
        resultValue = leftValue / rightValue;
      } else if (e.op === "**") {
        resultValue = leftValue ** rightValue;
      } else if (e.op === "<") {
        resultValue = leftValue < rightValue;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === "<=") {
        resultValue = leftValue <= rightValue;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === "==") {
        resultValue = leftValue === rightValue;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === "!=") {
        resultValue = leftValue !== rightValue;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === ">=") {
        resultValue = leftValue >= rightValue;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === ">") {
        resultValue = leftValue > rightValue;
        return { type: 'boolean', value: resultValue };
      } else if (e.op === "%") {
        resultValue = leftValue % rightValue;
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
  CallExpression(c) {
    c.callee = optimize(c.callee)
    c.args = c.args.map(optimize)
    return c
  },
  PrintStatement(s) {
    s.argument = optimize(s.argument)
    return s
  },
  FunctionBody(s) {
    s.statements = s.statements.flatMap(optimize)
    return s
  },
  ObjectCreation(s) {
    s.args = s.args.flatMap(optimize)
    return s
  },
  MethodCall(s) {
    return s
  },
  MapOrFilterCall(s) {
    return s
  },
  MatrixSubscriptExpression(s) {
    s.row = optimize(s.row)
    s.column = optimize(s.column)
    return s
  },
  Block(s) {
    s.statements = s.statements.flatMap(optimize)
    return s;
  },
  IntegerLiteral(s) {
    return { type: 'integer', value: s.value }
  },
  MatrixExpression(s) {
    s.rows = s.rows.flatMap(optimize)
    return s;
  },
  Variable(s) {
    const known = lastAssignedValue[s.name];
    if (s.type.endsWith('[]')) {
      return s;
    }
    if (known !== undefined) {
      return s;
    }
    return s;
  }

}