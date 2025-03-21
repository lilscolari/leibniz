export const intType = "int";
export const floatType = "float";
export const booleanType = "boolean";
export const anyType = "any";

export function variable(name, isMutable, type) {
  return { name, isMutable, type };
}

export function program(statements) {
  return { kind: "Program", statements };
}

export function variableDeclaration(variable, initializer) {
  return { kind: "VarDec", variable, initializer };
}

export function assignment(variable, expression) {
  return { kind: "Assignment", variable, expression };
}

export function printStatement(expression) {
  return { kind: "PrintStmt", expression };
}

export function binary(op, left, right, type) {
  return { kind: "BinaryExp", op, left, right, type };
}

export function integerLiteral(value) {
  return { kind: "IntLit", value, type: intType };
}

export function floatLiteral(value) {
  return { kind: "FloatLit", value, type: floatType };
}

export function stringLiteral(value) {
  return { kind: "StringLit", value, type: "string" };
}

export function booleanLiteral(value) {
  return { kind: "BoolLit", value, type: booleanType };
}

export function mathFunctionCall(name, args) {
  return { kind: "FuncCall", name, args };
}

export const standardLibrary = {
  print: variable("print", false, { paramTypes: ["any"], returnType: "void" }),
};
