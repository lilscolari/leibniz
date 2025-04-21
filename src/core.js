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

// these dont work if functions are passed to them. or variables. I assume it is bad to have these hardcoded as such. Can fix later.

export function Triangle(base, height) {
  return {
    type: 'Triangle',
    base: base,
    height: height,
    area: function() {
      return 0.5 * this.base.value * this.height.value;
    },
    perimeter: function() {
      const side = Math.sqrt(Math.pow(this.base.value, 2) + Math.pow(this.height.value, 2));
      return this.base.value + this.height.value + side;
    }
  };
}

export function Circle(radius) {
  return {
    type: 'Circle',
    radius: radius,
    area: function() {
      return Math.PI * Math.pow(this.radius.value, 2);
    },
    circumference: function() {
      return 2 * Math.PI * this.radius.value;
    }
  };
}

export function Rectangle(width, height) {
  return {
    type: 'Rectangle',
    width: width,
    height: height,
    area: function() {
      return this.width.value * this.height.value;
    },
    perimeter: function() {
      return 2 * (this.width.value + this.height.value);
    }
  };
}

export function forStatement(iterator, collection, body) {
  return { kind: "ForStatement", iterator, collection, body }
}