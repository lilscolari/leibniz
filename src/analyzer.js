import * as core from "./core.js";

export default function analyze(match) {
  const grammar = match.matcher.grammar;

  class Context {
    constructor(parent = null) {
      this.locals = new Map();
      this.parent = parent;
      this.classes = new Map();
      this.addBuiltInClasses();
    }

    addBuiltInClasses() {
      this.classes.set('Triangle', core.Triangle);
      this.classes.set('Circle', core.Circle);
      this.classes.set('Rectangle', core.Rectangle);
    }
  
    // Look up classes in the context
    lookupClass(name) {
      return this.classes.get(name) ?? (this.parent && this.parent.lookupClass(name));
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
  const target = [];

  function check(condition, message, parseTreeNode) {
    if (!condition) {
      throw new Error(
        `${parseTreeNode.source.getLineAndColumnMessage()} ${message}`
      );
    }
  }

  function checkNotDeclared(name, parseTreeNode) {
    check(
      !context.has(name),
      `Variable already declared: ${name}`,
      parseTreeNode
    );
  }

  function checkSameTypes(x, y, parseTreeNode) {
    check(x.type === y.type, `Operands must have the same type`, parseTreeNode);
  }

  function checkAllElementsHaveSameType(elements, parseTreeNode) {
    if (elements.length > 0) {
      const type = elements[0].type;
      for (const e of elements) {
        check(
          e.type === type,
          `All elements must have the same type`,
          parseTreeNode
        );
      }
    }
  }

  function checkNumber(e, parseTreeNode) {
    check(e.type === "number", `Expected number`, parseTreeNode);
  }

  function checkBoolean(e, parseTreeNode) {
    check(e.type === "boolean", `Expected boolean`, parseTreeNode);
  }

  function checkNumberOrString(e, parseTreeNode) {
    check(
      e.type === "number" || e.type === "string",
      `Expected number or string`,
      parseTreeNode
    );
  }
    
  const analyzer = grammar.createSemantics().addOperation("analyze", {
    Program(statements) {
      return core.program(statements.children.map((s) => s.analyze()));
    },
    PrintStmt(_print, _openParen, exp, _closeParen, _semi) {
      const argument = exp.analyze();
      // console.log("Analyzing PrintStmt:", exp.sourceString, "=>", argument);
      return core.printStatement(argument);
    },
    IfStmt(_if, _openParens, condition, _closeParens, block, _else, _openParens2, block2, _closeParens2) {
      const conditionExpr = condition.analyze();
      checkBoolean(conditionExpr, condition);
        
      const statements = block.analyze(); 
        
      let elseStatements = null;
        
      if (_else) {
        elseStatements = block2.analyze();
      }
      
      return core.ifStatement(conditionExpr, statements, elseStatements);
    },
    ForLoop(_for, id, _in, domain, _openParens, exp, _closeParens, block) {
      const rangeSizeExpr = exp.analyze();
      if (typeof rangeSizeExpr !== "number") {
        throw new Error("Expected a number for the loop range, but got: " + typeof rangeSizeExpr);
      }
      const range = Array.from({ length: rangeSizeExpr }, (_, i) => i);

      const iterator = core.variable(id.sourceString, core.intType)

      context = context.newChildContext();
      context.add(id.sourceString, iterator)

      const body = block.analyze()
      context = context.parent
      return core.forStatement(id.sourceString, range, body);
    },    
    VarDec(_qualifier, id, _eq, exp, _semi) {
      checkNotDeclared(id.sourceString, id);
      const initializer = exp.analyze();
      const variable = core.variable(
        id.sourceString,
        initializer.type,
      );
      context.add(id.sourceString, variable);
      return core.variableDeclaration(variable, initializer);
    },
    NonemptyListOf(first, _comma, rest) {
      const firstElement = first.analyze();
      const restElements = rest.children ? rest.children.map(child => child.analyze()) : [];
      return [firstElement, ...restElements];
    },
    _iter(...children) {
      return children.map(child => child.analyze());
    },
    ExpList(params) {
      if (!params || params.length === 0) {
        return [];
      }
        
      return params.children.map(paramNode => {
        if (paramNode && paramNode.sourceString) {
          return paramNode.sourceString.trim();
        } else {
          console.warn("Unexpected parameter node:", paramNode);
          return null;
        }
      }).filter(result => result !== null);
    },
    ParamList(params) {
      if (!params || params.length === 0) {
        return [];
      }
      
      return params.children.map(paramNode => {
        if (paramNode && paramNode.sourceString) {
          return paramNode.sourceString.trim();
        } else {
          console.warn("Unexpected parameter node:", paramNode);
          return null;
        }
      }).filter(result => result !== null);
    },
    Block(_openCurly, stmts, _closeCurly) {
      return stmts.children.map(stmt => stmt.analyze());
    },
    FuncBody(_openCurly, stmts, _return, returnStmt, _semi, _closeCurly) {
      context = context.newChildContext();

      const statements = stmts.children.map(stmt => stmt.analyze());
      const returnExpression = returnStmt.analyze();
      const returnType = returnExpression.type;
      
      context = context.parent;
      return {
        statements,
        returnExpression,
        returnType
      };
    },
    FuncCreation(_fun, id, _openParen, paramList, _closeParen, block) {
      checkNotDeclared(id.sourceString, id);
      context = context.newChildContext();
      // console.log(paramList.sourceString)
      const parameters = paramList.sourceString.split(',').map(param => param.trim());
      // console.log("Function Parameters:", parameters);
      parameters.forEach((paramName) => {
        if (paramName) {
          // console.log("Adding parameter:", paramName);

          const paramNode = { 
            name: paramName, 
            type: 'parameter', 
            value: undefined 
          };
    
          context.add(paramName, paramNode);
        } else {
          console.warn("Parameter name is empty:", paramName);
        }
      });
      // console.log(`Creating function: ${id.sourceString} with parameters:`, parameters);
      const body = block.analyze()
      context = context.parent;
      const fun = core.func(id.sourceString, parameters, body);
      context.add(id.sourceString, fun);
      // console.log(`Added function ${id.sourceString} to context`);
      return core.functionDeclaration(fun, body);
    },
    FunctionCall(id, _openParen, args, _closeParen) {
      const funcName = id.sourceString;
      // console.log(`Calling function: ${funcName}`);
      
      // List of built-in math functions
      const mathFunctions = {
        cos: { value: Math.cos, paramCount: 1 },
        sin: { value: Math.sin, paramCount: 1 },
        tan: { value: Math.tan, paramCount: 1 },
        arccos: { value: Math.acos, paramCount: 1 },
        arcsin: { value: Math.asin, paramCount: 1 },
        arctan: { value: Math.atan, paramCount: 1 },
        sqrt: { value: Math.sqrt, paramCount: 1 },
        log: { value: Math.log, paramCount: 1 },
        exp: { value: Math.exp, paramCount: 1 },
        ln: { value: Math.log, paramCount: 1 },
        log10: { value: Math.log10, paramCount: 1 },
        abs: { value: Math.abs, paramCount: 1 },
        floor: { value: Math.floor, paramCount: 1 },
        ceil: { value: Math.ceil, paramCount: 1 },
        round: { value: Math.round, paramCount: 1 },
        min: { value: Math.min, paramCount: -1 }, // -1 means variable number of arguments
        max: { value: Math.max, paramCount: -1 },
        pow: { value: Math.pow, paramCount: 2 },
        rand: { value: Math.random, paramCount: 0 },
        distance: { value: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2), paramCount: 4 }
      };
    
      function flatten(arr) {
        return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatten(val) : val), []);
      }
    
      let params = [];
    
      if (args && args.analyze) {
        params = flatten(args.analyze());
        // console.log(`Arguments for ${funcName}:`, params);
      }
    
      const funcContext = context.newChildContext();
    
      const userFunc = context.lookup(funcName);
      if (userFunc) {
        // Handle user-defined function
        userFunc.params.forEach((param, index) => {
          funcContext.add(param.sourceString, params[index]);
        });
        const result = core.functionCall(funcName, params);
        context = context.parent;
        return result;
      } else if (mathFunctions[funcName]) {
        // Validate the number of arguments
        const mathFunc = mathFunctions[funcName];
        const expectedParamCount = mathFunc.paramCount;
    
        if (expectedParamCount !== -1 && params.length !== expectedParamCount) {
          throw new Error(`Function ${funcName} expects ${expectedParamCount} argument(s), but received ${params.length}.`);
        }
    
        if (expectedParamCount === -1 && params.length < 1) {
          throw new Error(`Function ${funcName} requires at least one argument.`);
        }
    
        // Call the actual math function
        const result = mathFunc.value(...params);
        return result;
      } else {
        throw new Error(`Function ${funcName} is not defined`);
      }
    },
    scientificLiteral(digits1, _e, _sign, digits2) {
      // console.log("digits1:", digits1, "digits2:", digits2, "_sign:", _sign, "_e:", _e);

      let number = parseFloat(digits1.sourceString);
      // console.log(digits1.sourceString)
    
      if (_e !== undefined) {
        const exponent = parseInt(digits2.sourceString, 10);
        const sign = _sign.sourceString === "-" ? -1 : 1;
        number *= Math.pow(10, sign * exponent);
      }
    
      // console.log("Final Parsed Value:", number);
      return { value: number, type: "scientific" };
    },  
    decimalLiteral(digits1, _dot, digits2, _e, _sign, digits3) {
      let number1 = parseFloat(digits1.sourceString);
      let number2 = parseFloat(digits2.sourceString) * (1/10**digits2.sourceString.length);
      let number3 = number1 + number2
      if (_e.sourceString !== "") {
        const exponent = parseInt(digits3.sourceString.replace("E", "").replace("E+").replace("E-"), 10);
        const sign = _sign.sourceString === "-" ? -1 : 1;
        number3 *= Math.pow(10, sign * exponent);
        return { value: number3, type: "scientific" };
      }
      return { value: number3, type: "float" };
    },
    Factor_exp(primary, _op, factor) {
      if (_op.numChildren === 0) {
        return primary.analyze();
      }
      return core.binaryExpression(
        "**",
        primary.analyze(),
        factor.analyze(),
        "number"
      );
    },
    integerLiteral(digits) {
      return Number(digits.sourceString);
    },
    Stmt_increment(_op, id, _semi) {
      const variable = id.analyze();
      return core.incrementStatement(variable);
    },
    AssignmentStmt(id, _eq, exp, _semi) {
      const source = exp.analyze();
      const target = id.analyze();
      checkSameTypes(source, target, id);
      return core.assignmentStatement(source, target);
    },
    Exp_test(left, op, right) {
      const x = left.analyze();
      const y = right.analyze();
      if (op.sourceString === "==" || op.sourceString === "!=") {
        check(x.type === y.type, `Type mismatch`, op);
      } else {
        checkNumber(x, left);
        checkNumber(y, right);
      }
      return core.binaryExpression(op.sourceString, x, y, "boolean");
    },
    Condition_add(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumberOrString(x, left);
      checkSameTypes(x, y, right);
      return core.binaryExpression("+", x, y, "number");
    },
    Condition_sub(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      return core.binaryExpression("-", x, y, "number");
    },
    Term_mul(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumberOrString(x, left);
      checkNumber(y, right);
      return core.binaryExpression("*", x, y, x.type);
    },
    Term_div(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      return core.binaryExpression("/", x, y, "number");
    },
    Term_mod(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      return core.binaryExpression("%", x, y, "number");
    },
    Primary_parens(_open, exp, _close) {
      return exp.analyze();
    },
    Factor_neg(_op, operand) {
      checkNumber(operand.analyze(), operand);
      return unaryExpression("-", operand.analyze(), "number");
    },
    id(_first, _rest) {
      const entity = context.lookup(this.sourceString);
      check(entity, `${this.sourceString} not declared`, this);
      return entity;
    },
    true(_) {
      return true;
    },
    false(_) {
      return false;
    },
    stringlit(_open, chars, _close) {
      return chars.sourceString;
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
      } else {
        throw new Error(`Unknown object type: ${object.type}`);
      }

      return {
        object: objName,
        method: methodNameStr,
        result: object[methodNameStr]()
      };
    }, 
    ObjectCreation(_obj, id, _eq, className, _openParens, params, _closeParens, _semi) {
      const objName = id.sourceString;
      const classNameStr = className.sourceString;
      let constructorArgs = params ? params.analyze() : [];
    
      if (constructorArgs.length === 1 && typeof constructorArgs[0] === "string") {
        constructorArgs = constructorArgs[0].split(",").map(arg => arg.trim());
      }
    
      let object;
    
      if (classNameStr === "Triangle" || classNameStr === "Rectangle") {
        if (constructorArgs.length < 2) {
          throw new Error(`${classNameStr} requires exactly 2 arguments (base, height), but got ${constructorArgs.length}.`);
        }
        if (constructorArgs.length > 2) {
          console.warn(`${classNameStr} expects only 2 arguments. Ignoring extra arguments.`);
          constructorArgs.splice(2);
        }
        object = classNameStr === "Triangle"
          ? core.Triangle(constructorArgs[0], constructorArgs[1])
          : core.Rectangle(constructorArgs[0], constructorArgs[1]);
      } else if (classNameStr === "Circle") {
        if (constructorArgs.length < 1) {
          throw new Error(`Circle requires exactly 1 argument (radius), but got ${constructorArgs.length}.`);
        }
        if (constructorArgs.length > 1) {
          console.warn(`Circle expects only 1 argument. Ignoring extra arguments.`);
          constructorArgs.splice(1);
        }
        object = core.Circle(constructorArgs[0]);
      } else {
        throw new Error(`Unknown class: ${classNameStr}`);
      }
      context.add(objName, object);
      return core.assignmentStatement(object, core.variable(objName, 'object'));
    },
    mathConstant(node) {
      if (node.sourceString === "pi") {
        return Math.PI;
      } else if (node.sourceString === "e") {
        return Math.E;
      } else if (node.sourceString === "π") {
        return Math.PI;
      } else {
        throw new Error(`Unexpected math constant: ${node.sourceString}`);
      }
    }

  });
  return analyzer(match).analyze();

}

Number.prototype.type = "number";
Boolean.prototype.type = "boolean";
String.prototype.type = "string";