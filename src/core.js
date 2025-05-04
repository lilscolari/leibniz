export function program(statements) {
  return {
    kind: "Program",
    statements,
  };
}

export function variable(name, type, mutable) {
  return {
    kind: "Variable",
    name,
    type,
    mutable,
  };
}

export function incrementStatement(variable) {
  return {
    kind: "IncrementStatement",
    variable,
  };
}

export function decrementStatement(variable) {
  return {
    kind: "DecrementStatement",
    variable,
  };
}

export function breakStatement() {
  return {
    kind: "BreakStatement",
  };
}

export function variableDeclaration(variable, initializer) {
  return {
    kind: "VariableDeclaration",
    variable,
    initializer,
  };
}

export function functionDeclaration(fun, body) {
  return {
    kind: "FunctionDeclaration",
    fun,
    body,
  };
}

export function functionBody(statements, returnExp) {
  return {
    kind: "FunctionBody",
    statements,
    returnExp,
  };
}

export function función(name, parameters, returnType) {
  return {
    kind: "Function",
    name,
    parameters,
    returnType,
  };
}

export function printStatement(argument) {
  return {
    kind: "PrintStatement",
    argument,
  };
}

export function assignmentStatement(source, target) {
  return {
    kind: "AssignmentStatement",
    source,
    target,
  };
}

export function forLoopStatement(loopVar, start, stop, step, body) {
  return {
    kind: "ForLoopStatement",
    loopVar,
    start,
    stop,
    step,
    body,
  };
}

export function objectCreation(variable, objectType, args) {
  return {
    kind: "ObjectCreation",
    variable,
    objectType,
    args,
  };
}

export function methodCall(object, methodName, args, type) {
  return {
    kind: "MethodCall",
    object,
    methodName,
    args,
    type,
  };
}

export function mapOrFilterCall(object, methodName, args, type) {
  return {
    kind: "MapOrFilterCall",
    object,
    methodName,
    args,
    type,
  };
}

// export function filterExpression(object, methodName, args, type) {
//   return {
//     kind: "FilterExpression",
//     object,
//     methodName,
//     args,
//     type,
//   };
// }

// export function mapExpression(object, methodName, args, type) {
//   return {
//     kind: "MapExpression",
//     object,
//     methodName,
//     args,
//     type,
//   };
// }

export function binaryExpression(op, left, right, type) {
  return {
    kind: "BinaryExpression",
    op,
    left,
    right,
    type,
  };
}

export function unaryExpression(op, operand, type) {
  return {
    kind: "UnaryExpression",
    op,
    operand,
    type,
  };
}

export function arrayExpression(elements, type) {
  return {
    kind: "ArrayExpression",
    elements,
    type,
  };
}

export function subscriptExpression(array, index, type) {
  return {
    kind: "SubscriptExpression",
    array,
    index,
    type,
  };
}

export function matrixSubscriptExpression(matrix, row, column, type) {
  return {
    kind: "MatrixSubscriptExpression",
    matrix,
    row,
    column,
    type,
  };
}

// export function arrayIndexAssignment(target, index, source) {
//   return {
//     kind: "ArrayIndexAssignment",
//     target,
//     index,
//     source,
//   };
// }

// export function arrayMethodCall(array, method, callback, type) {
//   return {
//     kind: "ArrayMethodCall",
//     array,
//     method,
//     callback,
//     type,
//   };
// }

export function callExpression(callee, args, type) {
  return {
    kind: "CallExpression",
    callee,
    args,
    type,
  };
}

export function whileStatement(test, body) {
  return {
    kind: "WhileStatement",
    test,
    body,
  };
}

export function ifStatement(test, consequent, alternate) {
  return {
    kind: "IfStatement",
    test,
    consequent,
    alternate,
  };
}

export function block(statements) {
  return {
    kind: "Block",
    statements,
  };
}

export function integerLiteral(value) {
  return {
    kind: "IntegerLiteral",
    type: "integer",
    value
  }
}

// export function floatLiteral(value) {
//   return {
//     kind: "FloatLiteral",
//     type: "float",
//     value
//   }
// }

export function returnStatement(expression) {
  return {
    kind: "ReturnStatement",
    expression,
    type: expression?.type ?? "void",
  };
}

export function matrixExpression(rows, type = "matrix") {
  return {
    kind: "MatrixExpression",
    rows,
    type,
  };
}
