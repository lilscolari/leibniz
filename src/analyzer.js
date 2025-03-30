import * as core from "./core.js";

export default function analyze(match) {
  const grammar = match.matcher.grammar;

  class Context {
    constructor(parent = null) {
      this.locals = new Map();
      this.parent = parent;
    }
    add(name, entity) {
      this.locals.set(name, entity);
    }
    has(name) {
      return this.locals.has(name);
    }
    lookup(name) {
      return this.locals.get(name) ?? (this.parent && this.parent.lookup(name));
    }
    newChildContext() {
      return new Context(this);
    }
  }

  // THIS IS THE CURRENT CONTEXT THAT WE ARE TRACKING
  let context = new Context();

  function check(condition, message, parseTreeNode) {
    if (!condition) {
      throw new Error(
        `${parseTreeNode.source.getLineAndColumnMessage()} ${message}`
      );
    }
  }

  function checkType(e, type, parseTreeNode) {
    check(e.type === type, `Expected ${type}`, parseTreeNode);
  }

  function checkNumber(e, parseTreeNode) {
    check(
      e.type === "number" || e.type === "integer" || e.type === "float",
      `Expected number, integer, or float`,
      parseTreeNode
    );
  }

  function checkInteger(e, parseTreeNode) {
    check(e.type === "integer", `Expected integer`, parseTreeNode);
  }

  function checkFloat(e, parseTreeNode) {
    check(e.type === "float", `Expected float`, parseTreeNode);
  }

  function checkBoolean(e, parseTreeNode) {
    check(e.type === "boolean", `Expected boolean`, parseTreeNode);
  }

  function checkNumberOrString(e, parseTreeNode) {
    check(
      e.type === "number" || e.type === "integer" || e.type === "float" || e.type === "string",
      `Expected number, integer, float, or string`,
      parseTreeNode
    );
  }

  function checkArrayOrString(e, parseTreeNode) {
    check(
      e.type === "string" || e.type.endsWith("[]"),
      `Expected string or array`,
      parseTreeNode
    );
  }

  function checkSameTypes(x, y, parseTreeNode) {
    // Special case for numeric types: allow integer, float, and number to be compatible
    if (isNumericType(x.type) && isNumericType(y.type)) {
      return;
    }
    check(x.type === y.type, `Operands must have the same type`, parseTreeNode);
  }

  function isNumericType(type) {
    return type === "number" || type === "integer" || type === "float";
  }

  function getTypeCoercion(type1, type2) {

    if (isNumericType(type1) && isNumericType(type2)) {
      if (type1 === "float" || type2 === "float") {
        return "float";
      } else if (type1 === "number" || type2 === "number") {
        return "number";
      }
      return "integer";
    }

    if (type1 === type2) {
      return type1;
    }

    return null;
  }

  function checkAllElementsHaveSameType(elements, parseTreeNode) {
    if (elements.length > 0) {
      const type = elements[0].type;
      for (const e of elements) {
        // For numeric types, allow mixing integers, floats, and numbers
        if (isNumericType(type) && isNumericType(e.type)) {
          continue;
        }
        check(
          e.type === type,
          `All elements must have the same type`,
          parseTreeNode
        );
      }
    }
  }

  function checkArrayTypeMatches(arrayElements, declaredType, parseTreeNode) {
    if (arrayElements.length === 0) {
      // Empty arrays can match any array type
      return;
    }
    
    // Extract the element type from the array type (remove the '[]')
    const expectedElementType = declaredType.slice(0, -2);
    
    // Check that all elements match the expected type
    for (const element of arrayElements) {
      if (isNumericType(expectedElementType) && isNumericType(element.type)) {
        // For numeric types, allow implicit conversion if it's safe
        if (expectedElementType === "number" || 
            (expectedElementType === "float" && element.type === "integer")) {
          continue;
        }
      }
      
      check(
        element.type === expectedElementType,
        `Expected array element of type ${expectedElementType}, got ${element.type}`,
        parseTreeNode
      );
    }
  }

  function checkNotDeclared(name, parseTreeNode) {
    check(
      !context.locals.has(name),
      `Variable already declared: ${name}`,
      parseTreeNode
    );
  }

  function checkIsMutable(variable, parseTreeNode) {
    check(variable.mutable, `Assignment to immutable variable`, parseTreeNode);
  }

  function checkTypesCompatible(sourceType, targetType, parseTreeNode) {
    // Check if types are exactly the same
    if (sourceType === targetType) {
      return true;
    }
    
    // Check if both are array types
    if (sourceType.endsWith("[]") && targetType.endsWith("[]")) {
      const sourceElementType = sourceType.slice(0, -2);
      const targetElementType = targetType.slice(0, -2);
      
      // Check if element types are compatible
      return checkTypesCompatible(sourceElementType, targetElementType, parseTreeNode);
    }
    
    // Check if both are numeric types (integer, float, number)
    if (isNumericType(sourceType) && isNumericType(targetType)) {
      // Allow assignment from more specific to more general type
      if (sourceType === "integer" && (targetType === "number" || targetType === "float")) {
        return true;
      }
      if (sourceType === "float" && targetType === "number") {
        return true;
      }
      // Don't allow assignment from more general to more specific type
      check(false, `Cannot assign ${sourceType} to ${targetType}`, parseTreeNode);
    }
    
    // If we got here, types are not compatible
    check(false, `Cannot assign ${sourceType} to ${targetType}`, parseTreeNode);
  }

  const analyzer = grammar.createSemantics().addOperation("analyze", {
    Program(statements) {
      return core.program(statements.children.map((s) => s.analyze()));
    },
    Stmt_increment(_op, id, _semi) {
      const variable = id.analyze();
      checkNumber(variable, id);
      return core.incrementStatement(variable);
    },
    Stmt_break(_break, _semi) {
      return core.breakStatement();
    },
    VarDec(qualifier, id, _colon, type, _eq, exp, _semi) {
      checkNotDeclared(id.sourceString, id);
      const declaredType = type.analyze();
      const initializer = exp.analyze();
      
      // Special handling for array types
      if (declaredType.endsWith("[]") && initializer.kind === "ArrayExpression") {
        checkArrayTypeMatches(initializer.elements, declaredType, exp);
      } else {
        // Check that initializer type is compatible with declared type
        checkTypesCompatible(initializer.type, declaredType, exp);
      }
      
      const mutable = qualifier.sourceString === "let";
      const variable = core.variable(
        id.sourceString,
        declaredType,
        mutable
      );
      context.add(id.sourceString, variable);
      return core.variableDeclaration(variable, initializer);
    },
    FunDec(_fun, id, params, _colon, returnType, _eq, exp, _semi) {
      checkNotDeclared(id.sourceString, id);
      const declaredReturnType = returnType.analyze();
      
      context = context.newChildContext();
      const parameters = params.analyze();
      const body = exp.analyze();
      
      // Check that body's type is compatible with declared return type
      checkTypesCompatible(body.type, declaredReturnType, exp);
      
      context = context.parent;
      const fun = core.función(id.sourceString, parameters, declaredReturnType);
      context.add(id.sourceString, fun);
      return core.functionDeclaration(fun, body);
    },
    Params(_open, params, _close) {
      // Handle params that may or may not be iterated
      return params.children.map(p => p.analyze());
    },
    Param(id, _colon, type) {
      checkNotDeclared(id.sourceString, id);
      const paramType = type.analyze();
      const param = core.variable(id.sourceString, paramType, false);
      context.add(id.sourceString, param);
      return param;
    },
    Type_array(baseType, _brackets) {
      const base = baseType.analyze();
      return `${base}[]`;
    },
    Type_number(_) { return "number"; },
    Type_integer(_) { return "integer"; },
    Type_float(_) { return "float"; },
    Type_boolean(_) { return "boolean"; },
    Type_string(_) { return "string"; },
    PrintStmt(_print, _open, exp, _close, _semi) {
      const argument = exp.analyze();
      return core.printStatement(argument);
    },
    AssignmentStmt(id, _eq, exp, _semi) {
      const source = exp.analyze();
      const target = id.analyze();
      
      // Check that source type is compatible with target type
      checkTypesCompatible(source.type, target.type, id);
      
      checkIsMutable(target, id);
      return core.assignmentStatement(source, target);
    },
    WhileStmt(_while, exp, block) {
      const test = exp.analyze();
      checkBoolean(test, exp);
      const body = block.analyze();
      return core.whileStatement(test, body);
    },
    IfStmt(_if, exp, consequent, _else, alternate) {
      const test = exp.analyze();
      checkBoolean(test, exp);
      const consequentBlock = consequent.analyze();
      
      // Handle the optional alternate branch
      let alternateBlock = null;
      if (alternate && alternate.children && alternate.children.length > 0) {
        alternateBlock = alternate.children[0].analyze();
      }
      
      return core.ifStatement(test, consequentBlock, alternateBlock);
    },
    Block(_open, statements, _close) {
      // Create a new context for this block
      const savedContext = context;
      context = context.newChildContext();
      // Direct access to children instead of using asIteration
      const stmts = statements.children.map(s => s.analyze());
      // Restore the previous context when we're done
      context = savedContext;
      return core.block(stmts);
    },
    Exp_test(left, op, right) {
      const x = left.analyze();
      const y = right.analyze();
      if (op.sourceString === "==" || op.sourceString === "!=") {
        // For equality operators, types must be compatible
        const compatibleType = getTypeCoercion(x.type, y.type);
        check(compatibleType !== null, `Type mismatch`, op);
      } else {
        // For other relational operators, operands must be numeric
        checkNumber(x, left);
        checkNumber(y, right);
      }
      return core.binaryExpression(op.sourceString, x, y, "boolean");
    },
    Condition_add(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      
      // For addition, accept either:
      // 1. Both operands are numeric (integer, float, number)
      // 2. Both operands are strings (for concatenation)
      if (isNumericType(x.type) && isNumericType(y.type)) {
        // Result type is the more general of the two types
        const resultType = getTypeCoercion(x.type, y.type);
        return core.binaryExpression("+", x, y, resultType);
      } else if (x.type === "string" && y.type === "string") {
        return core.binaryExpression("+", x, y, "string");
      } else {
        check(false, `Cannot add ${x.type} and ${y.type}`, left);
      }
    },
    Condition_sub(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      // Result type is the more general of the two types
      const resultType = getTypeCoercion(x.type, y.type);
      return core.binaryExpression("-", x, y, resultType);
    },
    Term_mul(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      // Result type is the more general of the two types
      const resultType = getTypeCoercion(x.type, y.type);
      return core.binaryExpression("*", x, y, resultType);
    },
    Term_div(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      // Division always returns float (except when explicitly handling integer division)
      return core.binaryExpression("/", x, y, "float");
    },
    Term_mod(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      // Modulo operation typically returns the same type as the operands,
      // but we'll use integer for integer operands, otherwise float
      const resultType = (x.type === "integer" && y.type === "integer") ? "integer" : "float";
      return core.binaryExpression("%", x, y, resultType);
    },
    Primary_parens(_open, exp, _close) {
      return exp.analyze();
    },
    Factor_exp(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      // Exponentiation typically returns float unless both are integers and the exponent is positive
      return core.binaryExpression("**", x, y, "float");
    },
    Factor_neg(_op, operand) {
      const x = operand.analyze();
      checkNumber(x, operand);
      return core.unaryExpression("-", x, x.type);
    },
    Factor_not(_op, operand) {
      const x = operand.analyze();
      checkBoolean(x, operand);
      return core.unaryExpression("!", x, "boolean");
    },
    Factor_len(_op, operand) {
      const e = operand.analyze();
      checkArrayOrString(e, operand);
      return core.unaryExpression("#", e, "integer");
    },
    Primary_int(_) {
      // Handle the optional negative sign in the grammar
      const value = parseInt(this.sourceString, 10);
      return { type: "integer", value: value };
    },
    Primary_float(_) {
      // Handle the optional negative sign in the grammar
      const value = parseFloat(this.sourceString);
      return { type: "float", value: value };
    },
    Primary_array(_open, elements, _close) {
      // Handle elements without using asIteration
      const contents = elements.children.map(e => e.analyze());
      checkAllElementsHaveSameType(contents, _open);
      
      let elementType;
      if (contents.length > 0) {
        // If elements are numeric, use the most general numeric type
        if (isNumericType(contents[0].type)) {
          elementType = contents.reduce((type, elem) => getTypeCoercion(type, elem.type), contents[0].type);
        } else {
          elementType = contents[0].type;
        }
      } else {
        elementType = "any";
      }
      
      return core.arrayExpression(contents, `${elementType}[]`);
    },
    Primary_subscript(array, _open, index, _close) {
      const e = array.analyze();
      const i = index.analyze();
      checkArrayOrString(e, array);
      checkNumber(i, index);
      const baseType = e.type.endsWith("[]") 
        ? e.type.slice(0, -2) 
        : "string";
      return core.subscriptExpression(e, i, baseType);
    },
    Primary_mathfunc(call) {
      return call.analyze();
    },
    MathFuncCall_trig(func, _open, arg, _close) {
      const x = arg.analyze();
      checkNumber(x, arg);
      return core.callExpression(func.sourceString, [x], "float");
    },
    MathFuncCall_binary(func, _open, arg1, _comma, arg2, _close) {
      const x = arg1.analyze();
      const y = arg2.analyze();
      checkNumber(x, arg1);
      checkNumber(y, arg2);
      
      // Determine return type based on function
      let returnType;
      if (func.sourceString === "min" || func.sourceString === "max") {
        // min/max return the more general of the two input types
        returnType = getTypeCoercion(x.type, y.type);
      } else if (func.sourceString === "pow") {
        // pow typically returns float
        returnType = "float";
      } else {
        returnType = "float"; // Default for any other binary math functions
      }
      
      return core.callExpression(func.sourceString, [x, y], returnType);
    },
    MathFuncCall_unary(func, _open, arg, _close) {
      const x = arg.analyze();
      checkNumber(x, arg);
      
      // Determine return type based on function
      let returnType;
      if (func.sourceString === "floor" || func.sourceString === "ceil" || func.sourceString === "round") {
        returnType = "integer";
      } else if (func.sourceString === "abs") {
        // abs preserves the input type
        returnType = x.type;
      } else {
        returnType = "float"; 
      }
      return core.callExpression(func.sourceString, [x], returnType);
    },
    Primary_true(_) {
      return { type: "boolean", value: true };
    },
    Primary_false(_) {
      return { type: "boolean", value: false };
    },
    Primary_string(_) {
      return { type: "string", value: this.sourceString.slice(1, -1) };
    },
    Primary_id(_) {
      const entity = context.lookup(this.sourceString);
      check(entity, `${this.sourceString} not declared`, this);
      return entity;
    },
    id(_first, _rest) {
      // When id is used outside of variable reference context
      return this.sourceString;
    },
    _iter(...children) {
      return children.map(child => child.analyze());
    },
    NonemptyListOf(first, _sep, rest) {
      return [first.analyze(), ...rest.children.map(child => child.analyze())];
    },
    EmptyListOf() {
      return [];
    },
  });

  return analyzer(match).analyze();
}


Number.prototype.type = "number";
Boolean.prototype.type = "boolean";
String.prototype.type = "string";



// try to make integer and float literals work properly
Object.defineProperty(Number.prototype, "value", {
  get() { return this; }
});