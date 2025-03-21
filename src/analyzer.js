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
      
      const isMathFunc = ["cos", "sin", "tan", "arccos", "arcsin", "arctan", "sqrt", "log", "exp", "ln", "log10", "abs", "floor", "ceil", "round", "min", "max", "pow", "rand", "distance"]
        .includes(funcName);

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
        userFunc.params.forEach((param, index) => {
          funcContext.add(param.sourceString, params[index]);
        });
        const result = core.functionCall(funcName, params);
        context = context.parent;
        return result;
      } else if (isMathFunc) {
        const mathFunctions = {
          cos: Math.cos,
          sin: Math.sin,
          tan: Math.tan,
          arccos: Math.acos,
          arcsin: Math.asin,
          arctan: Math.atan,
          sqrt: Math.sqrt,
          log: Math.log,
          exp: Math.exp,
          ln: Math.log,
          log10: Math.log10,
          abs: Math.abs,
          floor: Math.floor,
          ceil: Math.ceil,
          round: Math.round,
          min: Math.min,
          max: Math.max,
          pow: Math.pow,
          rand: Math.random,
          distance: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        };

        if (mathFunctions[funcName]) {
          const result = mathFunctions[funcName](...params);
          return result;
        } else {
          throw new Error(`Math function ${funcName} is not defined.`);
        }
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
  });
  return analyzer(match).analyze();

}

Number.prototype.type = "number";
Boolean.prototype.type = "boolean";
String.prototype.type = "string";