import * as core from "./core.js";

export default function analyze(match) {
  const grammar = match.matcher.grammar;

  class Context {
    constructor(parent = null) {
      this.locals = new Map();
      this.parent = parent;
      this.inLoop = false;  // Track if we're in a loop for break statements
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
      const child = new Context(this);
      child.inLoop = this.inLoop;  // Inherit loop status
      return child;
    }
    enterLoop() {
      this.inLoop = true;
    }
    exitLoop() {
      this.inLoop = false;
    }
    isInLoop() {
      return this.inLoop;
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

  function checkNumber(e, parseTreeNode) {
    check(
      e.type === "number" || e.type === "integer" || e.type === "float",
      `Expected number, integer, or float`,
      parseTreeNode
    );
  }

  function checkBoolean(e, parseTreeNode) {
    check(e.type === "boolean", `Expected boolean`, parseTreeNode);
  }

  function checkArrayOrString(e, parseTreeNode) {
    check(
      e.type === "string" || e.type.endsWith("[]"),
      `Expected string or array`,
      parseTreeNode
    );
  }

  function checkBreakInLoop(parseTreeNode) {
    check(
      context.isInLoop(),
      `Break statement must be inside a loop`,
      parseTreeNode
    );
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

  function checkNotDeclared(name, parseTreeNode) {
    check(
      !context.has(name),
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
    
    // Check if both are numeric types
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
    return false;
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
      checkBreakInLoop(_break);
      return core.breakStatement();
    },
    
    VarDec(qualifier, id, _colon, type, _eq, exp, _semi) {
      checkNotDeclared(id.sourceString, id);
      const declaredType = type.analyze();
      const initializer = exp.analyze();
      
      // Check that initializer type is compatible with declared type
      checkTypesCompatible(initializer.type, declaredType, exp);
      
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
      
      // Create child context for the function
      const savedContext = context;
      context = context.newChildContext();
      
      // Process parameters
      const parameters = params.analyze();
      
      // Process function body
      const analyzedBody = body.analyze();
      
      // Check that body's return type is compatible with declared return type
      checkTypesCompatible(analyzedBody.returnType, declaredReturnType, body);
      
      // Restore context
      context = savedContext;
      
      // Create function and add to context
      const fun = core.función(id.sourceString, parameters, declaredReturnType);
      context.add(id.sourceString, fun);
      
      return core.functionDeclaration(fun, analyzedBody);
    },
    
    FuncBody(_open, statements, _return, returnExp, _semi, _close) {
      // Process statements in function body
      const analyzedStatements = statements.children.map(stmt => stmt.analyze());
      
      // Analyze return expression
      const returnExpression = returnExp.analyze();
      
      return core.funcBody(analyzedStatements, returnExpression, returnExpression.type);
    },
    
    Params(_open, params, _close) {
      return params.asIteration().children.map(p => p.analyze());
    },
    
    Param(id, _colon, type) {
      checkNotDeclared(id.sourceString, id);
      const paramType = type.analyze();
      const param = core.variable(id.sourceString, paramType, false);
      context.add(id.sourceString, param);
      return param;
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
      
      // Set context to be in a loop
      const savedContext = context;
      context = context.newChildContext();
      context.enterLoop();
      
      const body = block.analyze();
      
      // Restore context
      context = savedContext;
      
      return core.whileStatement(test, body);
    },
    
    IfStmt(_if, exp, consequent, _else, alternate) {
      const test = exp.analyze();
      checkBoolean(test, exp);
      const consequentBlock = consequent.analyze();
      
      // Handle the optional alternate branch
      let alternateBlock = null;
      if (alternate.children && alternate.children.length > 0) {
        alternateBlock = alternate.children[0].analyze();
      }
      
      return core.ifStatement(test, consequentBlock, alternateBlock);
    },
    
    Block(_open, statements, _close) {
      // Create a new context for this block
      const savedContext = context;
      context = context.newChildContext();
      
      // Process all statements
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
    
    Primary_int(_) {
      const value = parseInt(this.sourceString, 10);
      return { kind: "Literal", type: "integer", value: value };
    },
    
    Primary_float(_) {
      const value = parseFloat(this.sourceString);
      return { kind: "Literal", type: "float", value: value };
    },
    
    Primary_true(_) {
      return { kind: "Literal", type: "boolean", value: true };
    },
    
    Primary_false(_) {
      return { kind: "Literal", type: "boolean", value: false };
    },
    
    Primary_string(_) {
      return { kind: "Literal", type: "string", value: this.sourceString.slice(1, -1) };
    },
    
    Primary_id(_) {
      const entity = context.lookup(this.sourceString);
      check(entity, `${this.sourceString} not declared`, this);
      return entity;
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
    
    FunctionCall(id, _open, args, _close) {
      const funcName = id.sourceString;
      const func = context.lookup(funcName);
      check(func, `Function ${funcName} not declared`, id);
      check(func.kind === "Function", `${funcName} is not a function`, id);
      
      const analyzedArgs = args.analyze();
      
      // Check argument count
      check(
        analyzedArgs.length === func.parameters.length,
        `Expected ${func.parameters.length} arguments but got ${analyzedArgs.length}`,
        id
      );
      
      // Check argument types match parameter types
      for (let i = 0; i < analyzedArgs.length; i++) {
        checkTypesCompatible(
          analyzedArgs[i].type, 
          func.parameters[i].type, 
          args
        );
      }
      
      return core.callExpression(funcName, analyzedArgs, func.returnType);
    },
    
    // THIS IS THE KEY FIX - ExpList needs to have only one parameter
    ExpList(exps) {
      return exps.asIteration().children.map(e => e.analyze());
    },

    ForLoop(_for, id, _in, _domain, _open, exp, _close, block) {
      const rangeSize = exp.analyze();
      check(rangeSize.type === "integer", `Expected integer`, exp);
      
      // Create a new context with iterator variable
      const savedContext = context;
      context = context.newChildContext();
      context.enterLoop();
      
      // Add iterator variable to context
      const iterator = core.variable(id.sourceString, "integer", false);
      context.add(id.sourceString, iterator);
      
      // Process loop body
      const body = block.analyze();
      
      // Restore context
      context = savedContext;
      
      return core.forStatement(iterator, rangeSize.value, body);
    },
    
    forInteger(_digits) {
      return { kind: "Literal", type: "integer", value: parseInt(this.sourceString, 10) };
    },
    
    ObjectCreation(_obj, id, _eq, className, _open, args, _close, _semi) {
      // Check the class type
      const classType = className.sourceString;
      check(
        ["Triangle", "Rectangle", "Circle"].includes(classType),
        `Unknown class type: ${classType}`,
        className
      );
      
      // Process arguments
      const analyzedArgs = args.analyze();
      
      // Validate argument count based on class type
      if (classType === "Circle") {
        check(
          analyzedArgs.length === 1,
          `Circle requires exactly 1 argument (radius), but got ${analyzedArgs.length}`,
          args
        );
      } else {
        check(
          analyzedArgs.length === 2,
          `${classType} requires exactly 2 arguments (base, height), but got ${analyzedArgs.length}`,
          args
        );
      }
      
      // Validate argument types (all should be numeric)
      for (const arg of analyzedArgs) {
        checkNumber(arg, args);
      }
      
      // Create the object and add to context
      const object = core.objectCreation(id.sourceString, classType, analyzedArgs);
      context.add(id.sourceString, object);
      
      return object;
    },
    
    ObjectMethodCall(id, _dot, methodName, _open, _close) {
      const objName = id.sourceString;
      const object = context.lookup(objName);
      
      // Check object exists
      check(object, `${objName} not declared`, id);
      
      // Get method name
      const method = methodName.sourceString;
      
      // Validate method for object type
      if (object.className === "Circle") {
        check(
          ["area", "circumference"].includes(method),
          `${method} is not a valid method for Circle`,
          methodName
        );
      } else {
        check(
          ["area", "perimeter"].includes(method),
          `${method} is not a valid method for ${object.className}`,
          methodName
        );
      }
      
      return core.objectMethodCall(objName, method);
    },
    
    mathConstant(constant) {
      const name = constant.sourceString;
      return core.mathConstant(name);
    },
    
    id(_first, _rest) {
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

// Set up prototype properties
Number.prototype.type = "number";
Boolean.prototype.type = "boolean";
String.prototype.type = "string";

// Try to make integer and float literals work properly
Object.defineProperty(Number.prototype, "value", {
  get() { return this; }
});