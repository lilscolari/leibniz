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
    
    // Check if both are numeric types 
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
    VarDec(qualifier, id, _colon, type, _eq, exp, _semi) {
      checkNotDeclared(id.sourceString, id);
      const declaredType = type.analyze();
      const initializer = exp.analyze();
      
      // Check type compaitibility
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

    Params(_open, params, _close) {

      return params;
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
      const body = block.analyze();
      return core.whileStatement(test, body);
    },


    IfStmt(_if, exp, consequent, _else, alternate) {
      const test = exp.analyze();
      checkBoolean(test, exp);
      const consequentBlock = consequent.analyze();
      
      let alternateBlock = null;
      if (alternate.children && alternate.children.length > 0) {
        alternateBlock = alternate.children[0].analyze();
      }
      
      return core.ifStatement(test, consequentBlock, alternateBlock);
    },


    Block(_open, statements, _close) {

      const savedContext = context;
      context = context.newChildContext();
      

      const stmts = [];
      for (const statement of statements.children) {
        stmts.push(statement.analyze());
      }
      

      context = savedContext;
      return core.block(stmts);
    },


    Exp_test(left, op, right) {
      const x = left.analyze();
      const y = right.analyze();
      if (op.sourceString === "==" || op.sourceString === "!=") {

        const compatibleType = getTypeCoercion(x.type, y.type);
        check(compatibleType !== null, `Type mismatch`, op);
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


    Primary_int(_) {

      const value = parseInt(this.sourceString, 10);
      return { type: "integer", value: value };
    },

    Primary_float(_) {

      const value = parseFloat(this.sourceString);
      return { type: "float", value: value };
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
      

      let returnType;
      if (func.sourceString === "min" || func.sourceString === "max") {
        returnType = getTypeCoercion(x.type, y.type);
      } else if (func.sourceString === "pow") {
        returnType = "float";
      }
      // } else {
      //   returnType = "float"; 
      // }
      
      return core.callExpression(func.sourceString, [x, y], returnType);
    },

    // FunctionCall(id, _openParen, args, _closeParen) {
    //   const funcName = id.sourceString;
    //   // console.log(`Calling function: ${funcName}`);
      
    //   const mathFunctions = {
    //     cos: { value: Math.cos, paramCount: 1 },
    //     sin: { value: Math.sin, paramCount: 1 },
    //     tan: { value: Math.tan, paramCount: 1 },
    //     arccos: { value: Math.acos, paramCount: 1 },
    //     arcsin: { value: Math.asin, paramCount: 1 },
    //     arctan: { value: Math.atan, paramCount: 1 },
    //     sqrt: { value: Math.sqrt, paramCount: 1 },
    //     log: { value: Math.log, paramCount: 1 },
    //     exp: { value: Math.exp, paramCount: 1 },
    //     ln: { value: Math.log, paramCount: 1 },
    //     log10: { value: Math.log10, paramCount: 1 },
    //     abs: { value: Math.abs, paramCount: 1 },
    //     floor: { value: Math.floor, paramCount: 1 },
    //     ceil: { value: Math.ceil, paramCount: 1 },
    //     round: { value: Math.round, paramCount: 1 },
    //     min: { value: Math.min, paramCount: -1 },
    //     max: { value: Math.max, paramCount: -1 },
    //     pow: { value: Math.pow, paramCount: 2 },
    //     rand: { value: Math.random, paramCount: 0 },
    //     distance: { value: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2), paramCount: 4 },
    //     derivative: {
    //       value: (...args) => {
    //         const [expr, variable, value] = args;
    //         console.log(args)
        
    //         let numericValue = value;
    //         if (value !== undefined) {
    //           numericValue = Number(value);
    //           if (isNaN(numericValue)) {
    //             throw new Error("The third argument (value) must be a valid number (int or float).");
    //           }
    //         }
        
    //         const derivative = math.derivative(expr, variable);
    //         if (value === undefined) {
    //           return derivative.toString();
    //         } else {
    //           return derivative.evaluate({ [variable]: value });
    //         }
    //       },
    //       paramCount: -1
    //     }
    //   };
    
    //   let params = [];
    
    //   if (args && args.analyze) {
    //     params = flatten(args.analyze());
    //     // console.log(`Arguments for ${funcName}:`, params);
    //   }
    
    //   const funcContext = context.newChildContext();
    
    //   const userFunc = funcContext.lookup(funcName);
    //   if (userFunc) {
    //     userFunc.params.forEach((param, index) => {
    //       funcContext.add(param.sourceString, params[index]);
    //     });
    //     context = context.parent;
    //     return core.functionCall(funcName, params);
    //   } else if (mathFunctions[funcName]) {
    //     const mathFunc = mathFunctions[funcName];
    //     const expectedParamCount = mathFunc.paramCount;
    
    //     if (expectedParamCount !== -1 && params.length !== expectedParamCount) {
    //       throw new Error(`Function ${funcName} expects ${expectedParamCount} argument(s), but received ${params.length}.`);
    //     }    
    //     const result = mathFunc.value(...params);
    //     return result;
    //   }
    // },

    FunDec(_fun, id, params, _colon, returnType, _eq, exp) {
      checkNotDeclared(id.sourceString, id);
      const declaredReturnType = returnType.analyze();
      
      context = context.newChildContext();

      const parameters = [];
      for (const child of params.children[1].children) {
        parameters.push(child.analyze());
      }


      const body = exp.analyze();

      console.log(body)
      

      checkTypesCompatible(body.returnType, declaredReturnType, exp);
      
      context = context.parent;
      const fun = core.función(id.sourceString, parameters, declaredReturnType);
      context.add(id.sourceString, fun);
      return core.functionDeclaration(fun, body);
    },

    FunctionCall(id, _open, args, _close) {
      const analyzedArgs = args.asIteration().children.map(child => child.analyze());
      return core.callExpression(id.sourceString, analyzedArgs, "object");
    },

    FuncBody(_openCurly, stmts, _return, returnStmt, _semi, _closeCurly) {
      context = context.newChildContext();

      const statements = stmts.children.map(stmt => stmt.analyze());
      const returnExpression = returnStmt.analyze();
      const returnType = returnExpression.type;
      
      context = context.parent;
      return core.funcBody(statements, returnExpression, returnType);
    },

    MathFuncCall_unary(func, _open, arg, _close) {
      const x = arg.analyze();
      checkNumber(x, arg);
      

      let returnType;
      if (func.sourceString === "floor" || func.sourceString === "ceil" || func.sourceString === "round") {
        returnType = "integer";
      } else if (func.sourceString === "abs") {

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
      return { type: "string", value: this.sourceString };
    },

    Primary_id(_) {
      const entity = context.lookup(this.sourceString);
      check(entity, `${this.sourceString} not declared`, this);
      return entity;
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

    ObjectMethodCall(id, _dot, methodName, _openParens, _closeParens) {
      const objName = id.sourceString;
      const methodNameStr = methodName.sourceString;
      
      let object = context.lookup(objName);

      if (!object) {
        throw new Error(`Object ${objName} not found.`);
      }

      if (object.type === "Triangle" || object.type === "Rectangle") {
        const allowedMethods = ['area', 'perimeter'];
        if (!allowedMethods.includes(methodNameStr)) {
          throw new Error(`${methodNameStr} is not a valid method for ${object.type}.`);
        }
      } else if (object.type === "Circle") {
        const allowedMethods = ['area', 'circumference'];
        if (!allowedMethods.includes(methodNameStr)) {
          throw new Error(`${methodNameStr} is not a valid method for Circle.`);
        }
      }

      return core.objectMethodCall(objName, methodNameStr)

      // return {
      //   object: objName,
      //   method: methodNameStr,
      //   result: object[methodNameStr]()
      // };
    }, 
    ObjectCreation(_obj, id, _eq, className, _openParens, params, _closeParens, _semi) {
      const objName = id.sourceString;
      const classNameStr = className.sourceString;
      let constructorArgs = [];
      if (params) {
        // constructorArgs = params.analyze().map(arg => evaluate(arg));
        constructorArgs = params.analyze();
      }
    
      // if (constructorArgs.length === 1 && typeof constructorArgs[0] === "string") {
      //   constructorArgs = constructorArgs[0].split(",").map(arg => arg.trim());
      // }
    

      const object = core.objectCreation(objName, classNameStr, constructorArgs);

      // const variable = core.variable(objName, 'object', false);  // 'false' means immutable here
      // const assignment = core.variableDeclaration(variable, object);
    
      context.add(objName, object);

      return object;

      // if (classNameStr === "Triangle" || classNameStr === "Rectangle") {
      //   if (constructorArgs.length != 2) {
      //     throw new Error(`${classNameStr} requires exactly 2 arguments (base, height), but got ${constructorArgs.length}.`);
      //   }
      //   object = classNameStr === "Triangle"
      //     ? core.Triangle(constructorArgs[0], constructorArgs[1])
      //     : core.Rectangle(constructorArgs[0], constructorArgs[1]);
      // } else if (classNameStr === "Circle") {
      //   if (constructorArgs.length != 1) {
      //     throw new Error(`Circle requires exactly 1 argument (radius), but got ${constructorArgs.length}.`);
      //   }
      //   object = core.Circle(constructorArgs[0]);
      // }
      // context.add(objName, object);
      // return core.assignmentStatement(object, core.variable(objName, 'object'));
    },

    mathConstant(constant) {
      const name = constant.sourceString;
      if (["pi", "π", "e"].includes(name)) {
        return core.mathConstant(name);
      }
    },

    ForLoop(_for, id, _in, domain, _openParens, exp, _closeParens, block) {
      const rangeSizeExpr = exp.analyze();
      const range = Array.from({ length: rangeSizeExpr }, (_, i) => i);

      const iterator = core.variable(id.sourceString, core.intType)

      context = context.newChildContext();
      context.add(id.sourceString, iterator)

      const body = block.analyze()
      context = context.parent
      return core.forStatement(id.sourceString, range, body);
    },

    forInteger(digits) {
      return Number(digits.sourceString);
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