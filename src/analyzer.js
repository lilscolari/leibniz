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

  function checkBoolean(e, parseTreeNode) {
    check(e.type === "boolean", `Expected boolean, got ${e.type}`, parseTreeNode);
  }

  function checkArrayOrStringOrMatrix(e, parseTreeNode) {
    check(
      e.type === "string" || e.type.endsWith("[]") || e.type === "matrix",
      `Expected string or array, got ${e.type}`,
      parseTreeNode
    );
  }

  function isNumericType(type) {
    return type === "number" || type === "integer" || type === "float";
  }

  function getArrayElementType(arrayType) {
    return arrayType.slice(0, -2);
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
      return;
    }
    
    const expectedElementType = getArrayElementType(declaredType);
    
    for (const element of arrayElements) {
      if (isNumericType(expectedElementType) && isNumericType(element.type)) {
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
    if (sourceType === targetType) {
      return true;
    }
    
    if (sourceType.endsWith("[]") && targetType.endsWith("[]")) {
      const sourceElementType = sourceType.slice(0, -2);
      const targetElementType = targetType.slice(0, -2);
      
      return checkTypesCompatible(sourceElementType, targetElementType, parseTreeNode);
    }
    
    if (isNumericType(sourceType) && isNumericType(targetType)) {
      if (sourceType === "integer" && (targetType === "number" || targetType === "float")) {
        return true;
      }
      if (sourceType === "float" && targetType === "number") {
        return true;
      }
      check(false, `Cannot assign ${sourceType} to ${targetType}`, parseTreeNode);
    }
    
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
    ForLoop(_for, id, _in, _domain, domainArgs, block) {
      const savedContext = context;
      context = context.newChildContext();
    
      const loopVar = core.variable(id.sourceString, "integer", false);
      context.add(id.sourceString, loopVar);
    
      const args = domainArgs.analyze();
      let start, stop, step;
    
     if (args.length === 1) {
        start = core.integerLiteral(0);
        stop = args[0];
        step = core.integerLiteral(1);
      } else if (args.length === 2) {
        [start, stop] = args;
        step = core.integerLiteral(1);
      } else if (args.length === 3) {
        [start, stop, step] = args;
      } else {
        throw new Error("domain() requires 1 to 3 arguments, got " + args.length);
      }
    
      const body = block.analyze();
      context = savedContext;
    
      return core.forLoopStatement(loopVar, start, stop, step, body);
    },
    
    DomainArgs(_open, exp, _close) {
      if (exp.numChildren === 0 || exp.asIteration().children.length === 0) {
        throw new Error("domain() requires 1 to 3 arguments, got 0");
      }
      
      const args = exp.asIteration().children.map(arg => arg.analyze());
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const child = exp.asIteration().children[i];
        if (arg && child) {
          checkInteger(arg, child);
        }
      }
      
      return args;
    },
    
    ArrayIndexAssignment(subscript, _eq, exp, _semi) {
      const arraySubscript = subscript.analyze();
      const value = exp.analyze();
      
      const array = arraySubscript.array;
      const index = arraySubscript.index;
      
      checkArrayOrStringOrMatrix(array, subscript);
      checkIsMutable(array, subscript);
      
      if (array.type.endsWith("[]")) {
        const elementType = getArrayElementType(array.type);
        checkTypesCompatible(value.type, elementType, exp);
      } else if (array.type === "string") {
        checkType(value, "string", exp);
      }
      
      return core.assignmentStatement(value, arraySubscript);
    },
    
    MatrixIndexAssignment(subscript, _eq, exp, _semi) {
      const matrixSubscript = subscript.analyze();
      const value = exp.analyze();
    
      const matrix = matrixSubscript.matrix;
      const row = matrixSubscript.row;
      const column = matrixSubscript.column;
    
      checkArrayOrStringOrMatrix(matrix, subscript);
      checkNumber(row, subscript);
      checkNumber(column, subscript);
      checkIsMutable(matrix, subscript);
    
      checkNumber(value, exp);
    
      return core.assignmentStatement(value, matrixSubscript);
    },

    ArrayMethodCall_higherorder(array, _dot, method, _open, paramId, _colon, paramType, _arrow, exp, _close) {
      const arrayVar = array.analyze();
      const methodName = method.sourceString;
      
      const savedContext = context;
      context = context.newChildContext();
      
      const paramTypeValue = paramType.analyze();
      const param = core.variable(paramId.sourceString, paramTypeValue, false);
      context.add(paramId.sourceString, param);
      
      const lambdaExp = exp.analyze();
      
      context = savedContext;

      check(arrayVar.type && arrayVar.type.endsWith("[]"), 
      `Cannot call ${methodName} on non-array type ${arrayVar.type}`, array);
      
      const elementType = getArrayElementType(arrayVar.type);
      
      checkTypesCompatible(elementType, paramTypeValue, paramType);

      if (methodName === "map") {
        return core.mapOrFilterCall(arrayVar, methodName, [lambdaExp], arrayVar.type);
      } else if (methodName === "filter") {
        return core.mapOrFilterCall(arrayVar, methodName, [lambdaExp], arrayVar.type);
      }  
    },

    ArrayMethodCall_simple(array, _dot, method, _open, arg, _close) {
      const arrayVar = array.analyze();
      const methodName = method.sourceString;
      const argExp = arg.analyze()

      check(arrayVar.type && arrayVar.type.endsWith("[]"),
            `Cannot call ${methodName} on non-array type ${arrayVar.type}`, array);

      if (methodName === "map" || methodName === "filter") {
        return core.mapOrFilterCall(arrayVar, methodName, [argExp], arrayVar.type);
      }
    },
    
    VarDec(qualifier, id, _colon, type, _eq, exp, _semi) {
      checkNotDeclared(id.sourceString, id);
      const declaredType = type.analyze();
      const initializer = exp.analyze();
      
      if (declaredType.endsWith("[]") && initializer.kind === "ArrayExpression") {
        checkArrayTypeMatches(initializer.elements, declaredType, exp);
      } else {
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
    
    FunDec(_fun, id, params, _colon, returnType, _eq, body) {
      checkNotDeclared(id.sourceString, id);
      const declaredReturnType = returnType.analyze();
    
      context = context.newChildContext();
      const parameters = params.analyze().flat();
    
      const analyzedBody = body.analyze();
      const { statements, returnExp } = analyzedBody;
    
      const finalStatements = [...statements];
    
      if (declaredReturnType === "void") {
        if (returnExp && returnExp.type !== "void") {
          throw new Error(`Void function cannot return a value`);
        }
      } 
      finalStatements.push(core.returnStatement(returnExp));

      if (returnExp) {
        checkTypesCompatible(returnExp.type, declaredReturnType, returnType);
      }
    
      context = context.parent;
    
      const fun = core.función(id.sourceString, parameters, declaredReturnType);
      context.add(id.sourceString, fun);
      return core.functionDeclaration(fun, core.functionBody(finalStatements));
    },

    ReturnStatement(_return, exp, _semi) {
      if (exp.numChildren === 0) {
        return core.returnStatement({type: "void", value: null});
      }
      const expression = exp.children[0].analyze();
      return core.returnStatement(expression);
    },
        
    FuncBody(_open, stmts, maybeReturn, _close) {
      let returnExp = {type: "void", value: null};
      const bodyStatements = [];

      for (const stmt of stmts.children) {
        const analyzedStmt = stmt.analyze();
        
        if (analyzedStmt.kind === "ReturnStatement") {
          returnExp = analyzedStmt.expression;
          break;
        } else {
          bodyStatements.push(analyzedStmt);
        }
      }

      return {
        kind: "FuncBody",
        statements: bodyStatements,
        returnExp,
      };
    },
    
    FunctionCall(id, _open, args, _close) {
      const fun = context.lookup(id.sourceString);
      check(fun, `Function ${id.sourceString} not declared`, id);
      check(fun.kind === "Function", `${id.sourceString} is not a function`, id);
      
      const actualArgs = args.analyze().flat();
      
      check(
        actualArgs.length === fun.parameters.length,
        `Expected ${fun.parameters.length} argument(s), got ${actualArgs.length}`,
        id
      );
      
      for (let i = 0; i < actualArgs.length; i++) {
        checkTypesCompatible(actualArgs[i].type, fun.parameters[i].type, args.children[i]);
      }
      
      return core.callExpression(fun, actualArgs, fun.returnType);
    },
    
    Params(_open, params, _close) {
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
    Type_matrix(_) { return "matrix"; },
    Type_void(_) { return "void"; },
    
    PrintStmt(_print, _open, exp, _close, _semi) {
      const argument = exp.analyze();
      return core.printStatement(argument);
    },
    
    AssignmentStmt(id, _eq, exp, _semi) {
      const source = exp.analyze();
      const target = id.analyze();
      
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
      
      let alternateBlock = null;
      if (alternate && alternate.children && alternate.children.length > 0) {
        alternateBlock = alternate.children[0].analyze();
      }
      
      return core.ifStatement(test, consequentBlock, alternateBlock);
    },
    
    Block(_open, statements, _close) {
      const savedContext = context;
      context = context.newChildContext();
      const stmts = statements.children.map(s => s.analyze());
      context = savedContext;
      return core.block(stmts);
    },
    
    Exp_test(left, op, right) {
      const x = left.analyze();
      const y = right.analyze();
      if (op.sourceString === "==" || op.sourceString === "!=") {
        const compatibleType = getTypeCoercion(x.type, y.type);
        check(compatibleType !== null, `Type mismatch: ${x.type} and ${y.type}`, op);
      } else {
        checkNumber(x, left);
        checkNumber(y, right);
      }
      return core.binaryExpression(op.sourceString, x, y, "boolean");
    },
    
    Condition_add(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();

      if (isNumericType(x.type) && isNumericType(y.type)) {
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
      const resultType = getTypeCoercion(x.type, y.type);
      return core.binaryExpression("-", x, y, resultType);
    },
    
    Term_mul(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      const resultType = getTypeCoercion(x.type, y.type);
      return core.binaryExpression("*", x, y, resultType);
    },
    
    Term_div(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      return core.binaryExpression("/", x, y, "float");
    },
    
    Term_mod(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
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
      checkArrayOrStringOrMatrix(e, operand);
      return core.unaryExpression("#", e, "integer");
    },
    
    Primary_int(_) {
      const value = parseInt(this.sourceString, 10);
      return { type: "integer", value: value };
    },
    
    Primary_float(_) {
      const value = parseFloat(this.sourceString);
      return { type: "float", value: value };
    },
    
    Primary_array(_open, elements, _close) {
      const contents = elements.children.map(e => e.analyze())[0] || [];
    
      const isMatrixCandidate = contents.length > 0 && contents.every(
        e => e.kind === "ArrayExpression"
      );
    
      if (isMatrixCandidate) {
        const rowLengths = contents.map(row => row.elements.length);
        const allSameLength = rowLengths.every(len => len === rowLengths[0]);
    
        if (!allSameLength) {
          throw new Error("All rows in a matrix must have the same length");
        }
    
        const allElements = contents.flatMap(row => row.elements);
        checkAllElementsHaveSameType(allElements, _open);
    
        const numericType = allElements.reduce((type, elem) =>
          getTypeCoercion(type, elem.type), allElements[0].type);
    
        if (!isNumericType(numericType)) {
          throw new Error("Matrix elements must be numeric");
        }
    
        return core.matrixExpression(contents, "matrix");
      }
    
      checkAllElementsHaveSameType(contents, _open);
    
      let elementType = "any";
      if (contents.length > 0) {
        if (isNumericType(contents[0].type)) {
          elementType = contents.reduce((type, elem) =>
            getTypeCoercion(type, elem.type), contents[0].type);
        } else {
          elementType = contents[0].type;
        }
      }
    
      return core.arrayExpression(contents, `${elementType}[]`);
    },
    
    Primary_subscript(array, _open, index, _close) {
      const e = array.analyze();
      const i = index.analyze();
      if (e.type === "array") {
        return core.subscriptExpression(e, i, "number");
      }
      checkArrayOrStringOrMatrix(e, array);
      checkNumber(i, index);
      if (e.type === "matrix") {
        return core.subscriptExpression(e, i, "array");
      }

      if (e.type.endsWith("[]")) {
        let baseType = e.type.slice(0, -2);
        return core.subscriptExpression(e, i, baseType);
      }

      return core.subscriptExpression(e, i, "string");

    },
    
    Primary_matrix_subscript(array, _open, rowIndex, _close, _open2, colIndex, _close2) {
      const matrix = array.analyze();
      const row = rowIndex.analyze();
      const col = colIndex.analyze();
    
      checkArrayOrStringOrMatrix(matrix, array);
      checkNumber(row, rowIndex);
      checkNumber(col, colIndex);
    
      return core.matrixSubscriptExpression(matrix, row, col, "matrix");
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
      let returnType;

      if (func.sourceString === "column" || func.sourceString === "cross") {
        checkArrayOrStringOrMatrix(x, arg1);
        returnType = "array";
        return core.callExpression(func.sourceString, [x, y], returnType);
      }

      if (func.sourceString === "dot") {
        checkArrayOrStringOrMatrix(x, arg1);
        returnType = "float";
        return core.callExpression(func.sourceString, [x, y], returnType);
      }

      checkNumber(x, arg1);
      checkNumber(y, arg2);
      
      if (func.sourceString === "pow") {
        returnType = "float";
      } else if (func.sourceString === "choose") {
        returnType = "integer";
      } else if (func.sourceString === "perm") {
        returnType = "integer";
      } else if (func.sourceString === "rand") {
        returnType = "float";
      } else if (func.sourceString === "randint") {
        returnType = "integer";
      } else if (func.sourceString === "arange") {
        returnType = "integer[]"
      }
      
      return core.callExpression(func.sourceString, [x, y], returnType);
    },
    
    MathFuncCall_unary(func, _open, arg, _close) {
      const x = arg.analyze();

      let returnType;

      if (func.sourceString === "str") {
        checkNumber(x, arg);
        return core.callExpression("str", [x], "string");
      }

      if (func.sourceString === "count") {
        checkArrayOrStringOrMatrix(x, arg);
        returnType = "integer";
        return core.callExpression(func.sourceString, [x], returnType);
      }

      if (func.sourceString === "inv" || func.sourceString == "transpose") {
        checkArrayOrStringOrMatrix(x, arg);
        returnType = "matrix";
        return core.callExpression(func.sourceString, [x], returnType);
      } 

      if (func.sourceString === "eigs") {
        checkArrayOrStringOrMatrix(x, arg);
        returnType = "array";
        return core.callExpression(func.sourceString, [x], returnType);
      }

      if (func.sourceString === "ones" || func.sourceString === "zeros") {
        checkNumber(x, arg);
        returnType = "integer[]";
        return core.callExpression(func.sourceString, [x], returnType);
      }

      if (func.sourceString === "identity") {
        checkNumber(x, arg);
        returnType = "matrix";
        return core.callExpression(func.sourceString, [x], returnType);
      }

      if (func.sourceString === "shape") {
        checkArrayOrStringOrMatrix(x, arg);
        returnType = "integer[]";
        return core.callExpression(func.sourceString, [x], returnType);
      }
      

      if (func.sourceString === "median" || func.sourceString === "mean" || func.sourceString === "mode" || func.sourceString === "min"
        || func.sourceString === "max" || func.sourceString === "prod" || func.sourceString === "sum" || func.sourceString === "std"
        || func.sourceString === "variance" || func.sourceString === "arandom" || func.sourceString === "det"
      ) {
        checkArrayOrStringOrMatrix(x, arg);
        returnType = "float";
        return core.callExpression(func.sourceString, [x], returnType);
      } else if (func.sourceString === "sort") {
        checkArrayOrStringOrMatrix(x, arg);
        if (x.type === "string") {
          throw new Error(
            `sort functions only works on arrays`
          );
        } else {
          returnType = x.type;
        }
        
        return core.callExpression(func.sourceString, [x], returnType);
      }

      
      if (x.type.endsWith("[]")) {
        checkArrayOrStringOrMatrix(x, arg);
        returnType = "matrix";
        return core.callExpression(func.sourceString, [x], returnType);
      } else if (x.type === "matrix") {
        checkArrayOrStringOrMatrix(x, arg);
        returnType = "float[]";
        return core.callExpression(func.sourceString, [x], returnType);
      }
      
      checkNumber(x, arg);
      
      if (func.sourceString === "floor" || func.sourceString === "ceil" || func.sourceString === "round") {
        returnType = "integer";
      } else if (func.sourceString === "abs") {
        returnType = x.type;
      } else {
        returnType = "float"; 
      }
      return core.callExpression(func.sourceString, [x], returnType);
    },
    
    DerivativeFuncCall(_derivative, _open, fnExp, _comma1, varExp, _comma2, point, _close) {
      const functionExpr = fnExp.analyze();
      const variableExpr = varExp.analyze();
      const evaluationPoint = point.analyze();
      
      checkNumber(evaluationPoint, point);
      
      return core.callExpression("derivative", [functionExpr, variableExpr, evaluationPoint], "float");
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
      
      if (objectType === "Triangle") {
        check(argValues.length === 3, `Triangle requires 3 arguments (sides), got ${argValues.length}`, objType);
        argValues.forEach(arg => checkNumber(arg, objType));
        
        const variable = core.variable(id.sourceString, "Triangle", true);
        context.add(id.sourceString, variable);
        return core.objectCreation(variable, "Triangle", argValues);
      } else if (objectType === "Rectangle") {
        check(argValues.length === 2, `Rectangle requires 2 arguments (width, height), got ${argValues.length}`, objType);
        argValues.forEach(arg => checkNumber(arg, objType));
        
        const variable = core.variable(id.sourceString, "Rectangle", true);

        context.add(id.sourceString, variable);
        return core.objectCreation(variable, "Rectangle", argValues);
      } else if (objectType === "Circle") {
        check(argValues.length === 1, `Circle requires 1 argument (radius), got ${argValues.length}`, objType);
        argValues.forEach(arg => checkNumber(arg, objType));
        
        const variable = core.variable(id.sourceString, "Circle", true);
        context.add(id.sourceString, variable);
        return core.objectCreation(variable, "Circle", argValues);
      }
    },
    
    ObjectMethodCall(id, _dot, method, _open, _close) {
      const objName = id.sourceString;
      const object = context.lookup(objName);
      const methodName = method.sourceString;
      
      check(object, `Object ${objName} not declared`, id);
      
      return core.methodCall(object, methodName, [], "float");
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
    
    ExpList(_) {
      return this.children.map(e => e.analyze());
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

Object.defineProperty(Number.prototype, "value", {
  get() { return this; }
});