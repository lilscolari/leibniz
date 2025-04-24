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
    check(e.type === type, `Expected ${type}, got ${e.type}`, parseTreeNode);
  }

  function checkNumber(e, parseTreeNode) {
    check(
      e.type === "number" || e.type === "integer" || e.type === "float",
      `Expected number, integer, or float, got ${e.type}`,
      parseTreeNode
    );
  }

  function checkInteger(e, parseTreeNode) {
    check(e.type === "integer", `Expected integer, got ${e.type}`, parseTreeNode);
  }

  function checkFloat(e, parseTreeNode) {
    check(e.type === "float", `Expected float, got ${e.type}`, parseTreeNode);
  }

  function checkBoolean(e, parseTreeNode) {
    check(e.type === "boolean", `Expected boolean, got ${e.type}`, parseTreeNode);
  }

  function checkNumberOrString(e, parseTreeNode) {
    check(
      e.type === "number" || e.type === "integer" || e.type === "float" || e.type === "string",
      `Expected number, integer, float, or string, got ${e.type}`,
      parseTreeNode
    );
  }

  function checkArrayOrString(e, parseTreeNode) {
    check(
      e.type === "string" || e.type.endsWith("[]"),
      `Expected string or array, got ${e.type}`,
      parseTreeNode
    );
  }

  function checkSameTypes(x, y, parseTreeNode) {
    // Special case for numeric types: allow integer, float, and number to be compatible
    if (isNumericType(x.type) && isNumericType(y.type)) {
      return;
    }
    check(x.type === y.type, `Operands must have the same type: ${x.type} and ${y.type}`, parseTreeNode);
  }

  function isNumericType(type) {
    return type === "number" || type === "integer" || type === "float";
  }

  function isArrayType(type) {
    return type && type.endsWith("[]");
  }

  function getArrayElementType(arrayType) {
    return arrayType.slice(0, -2); // Remove the '[]' suffix
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
          `All elements must have the same type, found ${e.type} when expected ${type}`,
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
    const expectedElementType = getArrayElementType(declaredType);
    
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
    if (!sourceType || !targetType) {
      throw new Error(`Type mismatch: sourceType = ${sourceType}, targetType = ${targetType}`);
    }

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
    Stmt_decrement(_op, id, _semi) {
      const variable = id.analyze();
      checkNumber(variable, id);
      return core.decrementStatement(variable);
    },
    Stmt_break(_break, _semi) {
      return core.breakStatement();
    },
    ForLoop(_for, id, _in, _domain, _open, forInt, _close, block) {
      // Create new context for the loop variable
      const savedContext = context;
      context = context.newChildContext();
      
      // Analyze loop variable and body
      const loopVar = core.variable(id.sourceString, "integer", false);
      context.add(id.sourceString, loopVar);
      
      const upperBound = parseInt(forInt.sourceString, 10);
      const body = block.analyze();
      
      // Restore the previous context
      context = savedContext;

      return core.forLoopStatement(loopVar, upperBound, body);
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
    // Updated to match grammar rule arity - 7 parameters
    FunDec(_fun, id, params, _colon, returnType, _eq, body) {
      checkNotDeclared(id.sourceString, id);
      const declaredReturnType = returnType.analyze();
      
      context = context.newChildContext();
      const parameters = params.analyze().flat();
      
      // Handle the new FuncBody structure
      let analyzedBody;
      if (body.ctorName === "FuncBody") {
        // This is the new style function body with explicit return
        const stmts = body.children[1].children.map(s => s.analyze());
        const returnExp = body.children[3].analyze();
        
        // Check that return expression type is compatible with declared return type
        checkTypesCompatible(returnExp.type, declaredReturnType, body.children[3]);
        
        analyzedBody = core.functionBody(stmts, returnExp);
      } 
      // else {
      //   // This is the old style function body (expression)
      //   analyzedBody = body.analyze();
        
      //   // Check that body's type is compatible with declared return type
      //   checkTypesCompatible(analyzedBody.type, declaredReturnType, body);
      // }
      
      context = context.parent;
      const fun = core.función(id.sourceString, parameters, declaredReturnType);
      
      context.add(id.sourceString, fun);
      return core.functionDeclaration(fun, analyzedBody);
    },
    // FuncBody(_open, statements, _return, exp, _semi, _close) {
    //   // This will be handled in FunDec
    //   return this.sourceString;
    // },
    FunctionCall(id, _open, args, _close) {
      const fun = context.lookup(id.sourceString);
      check(fun, `Function ${id.sourceString} not declared`, id);
      check(fun.kind === "Function", `${id.sourceString} is not a function`, id);
      
      const actualArgs = args.analyze().flat();
      
      // Check that the number of arguments matches
      check(
        actualArgs.length === fun.parameters.length,
        `Expected ${fun.parameters.length} argument(s), got ${actualArgs.length}`,
        id
      );
      
      // Check that argument types match parameter types
      for (let i = 0; i < actualArgs.length; i++) {
        checkTypesCompatible(actualArgs[i].type, fun.parameters[i].type, args.children[i]);
      }
      
      return core.callExpression(fun, actualArgs, fun.returnType);
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
        check(compatibleType !== null, `Type mismatch: ${x.type} and ${y.type}`, op);
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
      const contents = elements.children.map(e => e.analyze())[0];
      checkAllElementsHaveSameType(contents, _open);
      
      let elementType;
      if (contents.length > 0) {
        // If elements are numeric, use the most general numeric type
        if (isNumericType(contents[0].type)) {
          elementType = contents.reduce((type, elem) => getTypeCoercion(type, elem.type), contents[0].type);
        } else {
          elementType = contents[0].type;
        }
      } 
      // else {
      //   elementType = "any";
      // }
      
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
      } 
      // else {
      //   returnType = "float"; // Default for any other binary math functions
      // }
      
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
    DerivativeFuncCall(_derivative, _open, fnStr, _comma1, varStr, _comma2, point, _close) {
      const functionString = fnStr.analyze();
      const variableString = varStr.analyze();
      const evaluationPoint = point.analyze();
      
      checkType(functionString, "string", fnStr);
      checkType(variableString, "string", varStr);
      checkNumber(evaluationPoint, point);
      
      return core.callExpression("derivative", [functionString, variableString, evaluationPoint], "float");
    },
    stringlit(_openQuote, chars, _closeQuote) {
      return { type: "string", value: this.sourceString.slice(1, -1) };
    },
    mathConstant(constant) {
      return constant.analyze();
    },
    piConst(_) {
      return { type: "float", value: Math.PI };
    },
    eConst(_) {
      return { type: "float", value: Math.E };
    },
    piSymbol(_) {
      return { type: "float", value: Math.PI };
    },
    ObjectCreation(_obj, id, _eq, objType, _open, args, _close, _semi) {
      const objectType = objType.sourceString;
      const argValues = args.analyze()[0];
      
      // Check argument count and types based on object type
      if (objectType === "Triangle") {
        check(argValues.length === 3, `Triangle requires 3 arguments (sides), got ${argValues.length}`, objType);
        argValues.forEach(arg => checkNumber(arg, objType));
        
        // Create a new object with the Triangle type
        const variable = core.variable(id.sourceString, "Triangle", true);
        context.add(id.sourceString, variable);
        return core.objectCreation(variable, "Triangle", argValues);
      } else if (objectType === "Rectangle") {
        check(argValues.length === 2, `Rectangle requires 2 arguments (width, height), got ${argValues.length}`, objType);
        argValues.forEach(arg => checkNumber(arg, objType));
        
        // Create a new object with the Rectangle type
        const variable = core.variable(id.sourceString, "Rectangle", true);

        context.add(id.sourceString, variable);
        return core.objectCreation(variable, "Rectangle", argValues);
      } else if (objectType === "Circle") {
        check(argValues.length === 1, `Circle requires 1 argument (radius), got ${argValues.length}`, objType);
        argValues.forEach(arg => checkNumber(arg, objType));
        
        // Create a new object with the Circle type
        const variable = core.variable(id.sourceString, "Circle", true);
        context.add(id.sourceString, variable);
        return core.objectCreation(variable, "Circle", argValues);
      }
    },
    ObjectMethodCall(id, _dot, method, _open, _close) {
      const objName = id.sourceString;
      const object = context.lookup(objName);
      const methodName = method.sourceString;
      
      // Check that the object exists and has the correct type
      check(object, `Object ${objName} not declared`, id);
      
      // Check that the method is valid for the object type
      if (object.type === "Triangle") {
        check(
          methodName === "area" || methodName === "perimeter",
          `Method ${methodName} not defined for Triangle objects`,
          method
        );
      } else if (object.type === "Rectangle") {
        check(
          methodName === "area" || methodName === "perimeter",
          `Method ${methodName} not defined for Rectangle objects`,
          method
        );
      } else if (object.type === "Circle") {
        check(
          methodName === "area" || methodName === "circumference" || methodName === "radius",
          `Method ${methodName} not defined for Circle objects`,
          method
        );
      } 
      // else {
      //   check(false, `Object ${objName} does not support methods`, id);
      // }
      
      // All geometric methods return float
      return core.methodCall(object, methodName, [], "float");
    },
    // StaticMethodCall(objType, _dot, method, _open, args, _close) {
    //   const objectType = objType.sourceString;
    //   const methodName = method.sourceString;
    //   const argValues = args ? args.analyze() : [];
      
    //   // Check that the static method call is valid
    //   if (objectType === "Triangle") {
    //     if (methodName === "area") {
    //       check(argValues.length === 3, `Triangle.area requires 3 arguments (sides), got ${argValues.length}`, objType);
    //     } else if (methodName === "perimeter") {
    //       check(argValues.length === 3, `Triangle.perimeter requires 3 arguments (sides), got ${argValues.length}`, objType);
    //     } else {
    //       check(false, `Method ${methodName} not defined for Triangle class`, method);
    //     }
    //   } else if (objectType === "Rectangle") {
    //     if (methodName === "area") {
    //       check(argValues.length === 2, `Rectangle.area requires 2 arguments (width, height), got ${argValues.length}`, objType);
    //     } else if (methodName === "perimeter") {
    //       check(argValues.length === 2, `Rectangle.perimeter requires 2 arguments (width, height), got ${argValues.length}`, objType);
    //     } else {
    //       check(false, `Method ${methodName} not defined for Rectangle class`, method);
    //     }
    //   } else if (objectType === "Circle") {
    //     if (methodName === "area") {
    //       check(argValues.length === 1, `Circle.area requires 1 argument (radius), got ${argValues.length}`, objType);
    //     } else if (methodName === "circumference") {
    //       check(argValues.length === 1, `Circle.circumference requires 1 argument (radius), got ${argValues.length}`, objType);
    //     } else if (methodName === "radius") {
    //       check(argValues.length === 1, `Circle.radius requires 1 argument (circumference), got ${argValues.length}`, objType);
    //     } else {
    //       check(false, `Method ${methodName} not defined for Circle class`, method);
    //     }
    //   }
      
    //   // Check that all arguments are numeric
    //   argValues.forEach(arg => checkNumber(arg, objType));
      
    //   // All geometric methods return float
    //   return core.staticMethodCall(objectType, methodName, argValues, "float");
    // },
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
    ExpList(_) {
      // Handle expressions list for function calls
      return this.children.map(e => e.analyze());
    },
    VarArgsList(first, _comma, rest) {
      // Handle variable argument lists
      return [first.analyze(), ...rest.children.map(e => e.analyze())];
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

    intlit(_neg, _digits) {
      return core.integerLiteral(parseInt(this.sourceString, 10));
    },
    floatlit(_neg, _whole, _dot, _frac, _exp, _sign, _expDigits) {
      return core.floatLiteral(parseFloat(this.sourceString));
    }
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