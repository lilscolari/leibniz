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

export function unaryExpression(op, operand, type) {
  return {
    kind: "UnaryExpression",
    op,
    operand,
    type,
  };
}

export function incrementStatement(variable) {
  return {
    kind: "IncrementStatement",
    variable,
  };
}

// export const booleanType = "boolean"
export const intType = "int"
// export const floatType = "float"
// export const scientificType = "scientific"
// export const stringType = "string"

export function functionDeclaration(func) {
  return { kind: "FunctionDeclaration", func }
}

export function func(name, params, body) {
  return { kind: "Function", name, params, body }
}

// export function intrinsicFunction(name, type) {
//   return { kind: "Function", name, type, intrinsic: true }
// }

export function functionCall(name, params) {
  return { kind: "FunctionCall", name, params }
}

// export function functionType(paramTypes, returnType) {
//   return { kind: "FunctionType", paramTypes, returnType }
// }

// export function returnStatement(expression) {
//   return { kind: "ReturnStatement", expression }
// }

export function forStatement(iterator, collection, body) {
  return { kind: "ForStatement", iterator, collection, body }
}

// const floatToFloatType = functionType([floatType], floatType)
// const floatFloatToFloatType = functionType([floatType, floatType], floatType)

// export const standardLibrary = Object.freeze({
//   int: intType,
//   float: floatType,
//   scientific: scientificType,
//   boolean: booleanType,
//   string: stringType,
//   π: variable("π", false, floatType),
//   e: variable("e", false, floatType),
//   sqrt: intrinsicFunction("sqrt", floatToFloatType),
//   sin: intrinsicFunction("sin", floatToFloatType),
//   cos: intrinsicFunction("cos", floatToFloatType),
//   tan: intrinsicFunction("tan:", floatToFloatType),
//   arcsin: intrinsicFunction("arcsin", floatToFloatType),
//   arccos: intrinsicFunction("arccos", floatToFloatType),
//   arctan: intrinsicFunction("arctan:", floatToFloatType),
//   log: intrinsicFunction("log", floatToFloatType),
//   log10: intrinsicFunction("log10", floatToFloatType),
//   ln: intrinsicFunction("ln", floatToFloatType),
//   abs: intrinsicFunction("abs:", floatToFloatType),
//   floor: intrinsicFunction("floor", floatToFloatType),
//   ceil: intrinsicFunction("ceil", floatToFloatType),
//   round: intrinsicFunction("round:", floatToFloatType),
//   min: intrinsicFunction("min", floatToFloatType),
//   max: intrinsicFunction("max", floatToFloatType),
//   pow: intrinsicFunction("pow:", floatToFloatType),  
//   exp: intrinsicFunction("exp", floatToFloatType),
//   rand: intrinsicFunction("rand", floatToFloatType),
//   distance: intrinsicFunction("distance", floatToFloatType),
// })

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
    }
  };
}

//String.prototype.type = stringType
//Number.prototype.type = floatType
BigInt.prototype.type = intType
//Boolean.prototype.type = booleanType