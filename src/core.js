export function program(statements) {
  return {
    kind: "Program",
    statements,
  };
}

export function printStatement(argument) {
  return {
    kind: "PrintStatement",
    argument,
  };
}

export function ifStatement(condition, block, elseStmt = null) {
  return {
    kind: "IfStatement",
    condition,
    block,
    elseStmt,
  };
}

export function variable(name, type) {
  return {
    kind: "Variable",
    name,
    type,
  };
}

export function variableDeclaration(variable, initializer) {
  return {
    kind: "VariableDeclaration",
    variable,
    initializer,
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

export function incrementStatement(variable) {
  return {
    kind: "IncrementStatement",
    variable,
  };
}

export function typeDeclaration(type) {
  return {
    kind: "TypeDeclaration",
    type,
  }
}

export const booleanType = "boolean"
export const intType = "int"
export const floatType = "float"
export const scientificType = "scientific"
export const stringType = "string"

export function field(name, type) {
  return { kind: "Field", name, type }
}

export function functionDeclaration(func) {
  return { kind: "FunctionDeclaration", func }
}

export function func(name, params, body) {
  return { kind: "Function", name, params, body }
}

export function intrinsicFunction(name, type) {
  return { kind: "Function", name, type, intrinsic: true }
}

export function functionType(paramTypes, returnType) {
  return { kind: "FunctionType", paramTypes, returnType }
}

export function increment(variable) {
  return { kind: "Increment", variable }
}
  
export function decrement(variable) {
  return { kind: "Decrement", variable }
}

export function assignment(target, source) {
  return { kind: "Assignment", target, source }
}

export function returnStatement(expression) {
  return { kind: "ReturnStatement", expression }
}
  
export function shortIfStatement(test, consequent) {
  return { kind: "ShortIfStatement", test, consequent }
}

export function forStatement(iterator, collection, body) {
  return { kind: "ForStatement", iterator, collection, body }
}
  
export function conditional(test, consequent, alternate, type) {
  return { kind: "Conditional", test, consequent, alternate, type }
}

export function constructorCall(callee, args) {
  return { kind: "ConstructorCall", callee, args, type: callee }
}

const floatToFloatType = functionType([floatType], floatType)
const floatFloatToFloatType = functionType([floatType, floatType], floatType)

function validateArgs(args, expectedCount, validator = () => true) {
  if (args.length !== expectedCount) {
    throw new Error(`Error: ${expectedCount} argument(s) expected, but got ${args.length}.`);
  }
  if (!args.every((arg) => typeof arg === "number")) {
    throw new Error("Error: All arguments must be numbers.");
  }
  if (!validator(...args)) {
    throw new Error(`Error: Invalid input for function.`);
  }
}

export const standardLibrary = Object.freeze({
  int: intType,
  float: floatType,
  scientific: scientificType,
  boolean: booleanType,
  string: stringType,
  π: variable("π", false, floatType),
  e: variable("e", false, floatType),

  sqrt: intrinsicFunction("sqrt", floatToFloatType, (args) => {
    validateArgs(args, 1, (x) => x >= 0);
    return Math.sqrt(args[0]);
  }),

  sin: intrinsicFunction("sin", floatToFloatType, (args) => {
    validateArgs(args, 1);
    return Math.sin(args[0]);
  }),

  cos: intrinsicFunction("cos", floatToFloatType, (args) => {
    validateArgs(args, 1);
    return Math.cos(args[0]);
  }),

  tan: intrinsicFunction("tan", floatToFloatType, (args) => {
    validateArgs(args, 1);
    return Math.tan(args[0]);
  }),

  log: intrinsicFunction("log", floatToFloatType, (args) => {
    validateArgs(args, 1, (x) => x > 0);
    return Math.log(args[0]);
  }),

  log10: intrinsicFunction("log10", floatToFloatType, (args) => {
    validateArgs(args, 1, (x) => x > 0);
    return Math.log10(args[0]);
  }),

  abs: intrinsicFunction("abs", floatToFloatType, (args) => {
    validateArgs(args, 1);
    return Math.abs(args[0]);
  }),

  floor: intrinsicFunction("floor", floatToFloatType, (args) => {
    validateArgs(args, 1);
    return Math.floor(args[0]);
  }),

  ceil: intrinsicFunction("ceil", floatToFloatType, (args) => {
    validateArgs(args, 1);
    return Math.ceil(args[0]);
  }),

  round: intrinsicFunction("round", floatToFloatType, (args) => {
    validateArgs(args, 1);
    return Math.round(args[0]);
  }),

  min: intrinsicFunction("min", floatToFloatType, (args) => {
    validateArgs(args, 2);
    return Math.min(...args);
  }),

  max: intrinsicFunction("max", floatToFloatType, (args) => {
    validateArgs(args, 2);
    return Math.max(...args);
  }),

  pow: intrinsicFunction("pow", floatToFloatType, (args) => {
    validateArgs(args, 2);
    return Math.pow(args[0], args[1]);
  }),

  exp: intrinsicFunction("exp", floatToFloatType, (args) => {
    validateArgs(args, 1);
    return Math.exp(args[0]);
  }),

  rand: intrinsicFunction("rand", floatToFloatType, (args) => {
    validateArgs(args, 0);
    return Math.random();
  }),

  distance: intrinsicFunction("distance", floatToFloatType, (args) => {
    validateArgs(args, 4);
    return Math.sqrt((args[2] - args[0]) ** 2 + (args[3] - args[1]) ** 2);
  }),
});

export function Triangle(base, height) {
  return {
    type: 'Triangle',
    base: base,
    height: height,
    area: function() {
      return 0.5 * this.base * this.height;
    },
    perimeter: function() {
      const side = Math.sqrt(Math.pow(this.base, 2) + Math.pow(this.height, 2));
      return this.base + this.height + side;
    },
    callMethod: function(methodName) {
      const allowedMethods = ['area', 'perimeter'];
      if (!allowedMethods.includes(methodName)) {
        throw new Error(`${methodName} is not a valid method for Triangle.`);
      }
      return this[methodName]();
    }
  };
}

export function Circle(radius) {
  return {
    type: 'Circle',
    radius: radius,
    area: function() {
      return Math.PI * Math.pow(this.radius, 2);
    },
    circumference: function() {
      return 2 * Math.PI * this.radius;
    },
    callMethod: function(methodName) {
      const allowedMethods = ['area', 'circumference'];
      if (!allowedMethods.includes(methodName)) {
        throw new Error(`${methodName} is not a valid method for Circle.`);
      }
      return this[methodName]();
    }
  };
}

export function Rectangle(width, height) {
  return {
    type: 'Rectangle',
    width: width,
    height: height,
    area: function() {
      return this.width * this.height;
    },
    perimeter: function() {
      return 2 * (this.width + this.height);
    },
    callMethod: function(methodName) {
      const allowedMethods = ['area', 'perimeter'];
      if (!allowedMethods.includes(methodName)) {
        throw new Error(`${methodName} is not a valid method for Rectangle.`);
      }
      return this[methodName]();
    }
  };
}

String.prototype.type = stringType
Number.prototype.type = floatType
BigInt.prototype.type = intType
Boolean.prototype.type = booleanType