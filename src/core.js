// Core module for Leibniz language
// This module provides the constructs used by the analyzer

export function program(statements) {
  return {
    kind: "Program",
    statements
  };
}

export function variable(name, type, mutable = true) {
  return {
    kind: "Variable",
    name,
    type,
    mutable
  };
}

export function variableDeclaration(variable, initializer) {
  return {
    kind: "VariableDeclaration",
    variable,
    initializer
  };
}

export function incrementStatement(variable) {
  return {
    kind: "IncrementStatement",
    variable
  };
}

export function decrementStatement(variable) {
  return {
    kind: "DecrementStatement",
    variable
  };
}

export function printStatement(argument) {
  return {
    kind: "PrintStatement",
    argument
  };
}

export function assignmentStatement(source, target) {
  return {
    kind: "AssignmentStatement",
    source,
    target
  };
}

export function block(statements) {
  return {
    kind: "Block",
    statements
  };
}

export function ifStatement(test, consequent, alternate) {
  return {
    kind: "IfStatement",
    test,
    consequent,
    alternate
  };
}

export function forLoop(loopVariable, count, body) {
  return {
    kind: "ForLoop",
    loopVariable,
    count,
    body
  };
}

export function literalExpression(value, type) {
  return {
    kind: "LiteralExpression",
    value,
    type
  };
}

export function unaryExpression(op, operand, type) {
  return {
    kind: "UnaryExpression",
    op,
    operand,
    type
  };
}

export function binaryExpression(op, left, right, type) {
  return {
    kind: "BinaryExpression",
    op,
    left,
    right,
    type
  };
}

export function arrayExpression(elements, type) {
  return {
    kind: "ArrayExpression",
    elements,
    type
  };
}

// Function-related structures
export function functionDeclaration(func, body) {
  return {
    kind: "FunctionDeclaration",
    func,
    body
  };
}

export function función(name, parameters, returnType) {
  return {
    kind: "Function",
    name,
    parameters,
    type: returnType,
    kind: "Function"
  };
}