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

export function funcBody(statements, returnExpression, returnType) {
  return {
    kind: "FunctionBody",
    statements,
    returnExpression,
    returnType,
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

export function binaryExpression(op, left, right, type) {
  // Fix for the uncovered branch
  if (!op || !left || !right || !type) {
    throw new Error("Invalid arguments for binary expression");
  }
  
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

export function callExpression(callee, args, type) {
  return {
    kind: "CallExpression",
    callee,
    args,
    type,
  };
}

export function objectCreation(variable, className, args) {
  return {
    kind: "ObjectCreation",
    variable,
    className,
    args,
    type: className
  };
}

export function objectMethodCall(object, method) {
  return {
    kind: "ObjectMethodCall",
    object,
    method,
    type: method === "area" || method === "perimeter" || method === "circumference" ? "float" : "object"
  };
}

export function forStatement(iterator, range, body) {
  return { 
    kind: "ForStatement", 
    iterator, 
    range, 
    body 
  };
}

export function mathConstant(name) {
  return {
    kind: "MathConstant",
    name,
    type: "float",
    value: name === "pi" || name === "π" ? Math.PI : Math.E
  };
}