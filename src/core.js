// core.js

// Types
export const intType = "int";
export const floatType = "float";
export const stringType = "string";
export const booleanType = "bool";
export const voidType = "void";
export const anyType = "any";

// New AST node creator for boolean literals.
export function booleanLiteral(value) {
  return { kind: "BooleanLiteral", value, type: booleanType };
}

// If you want to support math function calls, add this:
export function mathFunctionCall(name, args) {
  return { kind: "MathFunctionCall", name, args };
}
