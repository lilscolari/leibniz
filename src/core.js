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

export function forLoopStatement(loopVar, upperBound, body) {
  return {
    kind: "ForLoopStatement",
    loopVar,
    upperBound,
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

export function staticMethodCall(className, methodName, args, type) {
  return {
    kind: "StaticMethodCall",
    className,
    methodName,
    args,
    type,
  };
}

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