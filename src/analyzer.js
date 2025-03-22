import * as core from "./core.js";

export default function analyze(match) {
  // Retrieve the grammar from the match
  const grammar = match.matcher.grammar;

  class Context {
    constructor(parent = null) {
      this.locals = new Map();
      this.parent = parent;
    }
    add(name, entity) {
      if (this.locals.has(name)) {
        throw new Error(`Variable already declared: ${name}`);
      }
      this.locals.set(name, entity);
    }
    lookup(name) {
      return this.locals.get(name) || (this.parent && this.parent.lookup(name));
    }
    newChildContext() {
      return new Context(this);
    }
  }
  let context = new Context();

  function check(condition, message, node) {
    if (!condition) {
      throw new Error(`${node.source.getLineAndColumnMessage()} ${message}`);
    }
  }
  function checkType(e, expected, node) {
    check(e.type === expected, `Expected type ${expected} but got ${e.type}`, node);
  }
  function checkSameType(e1, e2, node) {
    check(e1.type === e2.type, `Type mismatch: ${e1.type} vs ${e2.type}`, node);
  }

  const semantics = grammar.createSemantics().addOperation("analyze", {
    // --- Top Level ---
    Program(children) {
      return core.program(children.children.map(child => child.analyze()));
    },


    increment(...children) {
      const idNode = children[0];
      const variable = idNode.analyze();
      return core.incrementStatement(variable);
    },

    // For the alternative: id "--;" --decrement
    decrement(...children) {
      const idNode = children[0];
      const variable = idNode.analyze();
      return core.decrement(variable);
    },

    // VarDec = let id (":" Type)? "=" Exp ";"
    VarDec(...children) {

      const idNode = children[1];
      const optType = children[2];
      const expNode = children[4];
      let declaredType = core.anyType;
      if (optType.numChildren > 0) {
        declaredType = optType.children[1].analyze();
      }
      check(!context.lookup(idNode.sourceString), `Variable already declared: ${idNode.sourceString}`, idNode);
      const initializer = expNode.analyze();
      const variable = core.variable(idNode.sourceString, declaredType);
      context.add(idNode.sourceString, variable);
      return core.variableDeclaration(variable, initializer);
    },

    // PrintStmt = print "(" Exp ");"
    PrintStmt(_print, _open, exp, _close, _semi) {
      const argument = exp.analyze();
      return core.printStatement(argument);
    },

    // IfStmt = if "("? Exp ")"? Block (else "("? (Block | IfStmt) ")"?)?
    IfStmt(...children) {

      const test = children[1].analyze();
      checkType(test, core.booleanType, children[1]);
      const consequent = children[2].analyze();
      let alternate = null;
      if (children.length > 3) {
        alternate = children[3].analyze();
      }
      return core.ifStatement(test, consequent, alternate);
    },

    // --- Assignment Statement ---
    // AssignmentStmt = id "=" Exp ";"
    AssignmentStmt(...children) {
      const idNode = children[0];
      const expNode = children[2];
      const target = idNode.analyze();
      const source = expNode.analyze();
      checkSameType(target, source, idNode);
      return core.assignmentStatement(source, target);
    },

    // --- Block ---
    // Block = "{" Stmt* "}"
    Block(_open, statements, _close) {
      const oldContext = context;
      context = context.newChildContext();
      const stmts = statements.children.map(child => child.analyze());
      context = oldContext;
      return stmts;
    },

    // --- For Loop ---
    // ForLoop = for id in domain "(" Exp ")" Block
    ForLoop(_for, id, _in, _domain, _open, exp, _close, block) {
      const collection = exp.analyze();
      checkType(collection, core.intType, exp);
      const oldContext = context;
      context = context.newChildContext();
      context.add(id.sourceString, core.variable(id.sourceString, core.intType));
      const body = block.analyze();
      context = oldContext;
      return core.forStatement(id.sourceString, collection, body);
    },

    // --- Expression ---
    // Exp = Condition relop Condition --test | Condition
    Exp_test(left, op, right) {
      const l = left.analyze();
      const r = right.analyze();
      if (op.sourceString === "==" || op.sourceString === "!=") {
        check(l.type === r.type, `Operands must be the same type`, op);
      } else {
        checkType(l, core.intType, left);
        checkType(r, core.intType, right);
      }
      return core.binaryExpression(op.sourceString, l, r, core.booleanType);
    },
    Exp_condition(cond) {
      return cond.analyze();
    },

    // --- Condition ---
    // Condition = Exp "+" Term --add
    //           | Exp "-" Term --sub
    //           | Term
    Condition_add(left, _plus, right) {
      const l = left.analyze();
      const r = right.analyze();
      checkType(l, core.intType, left);
      checkType(r, core.intType, right);
      return core.binaryExpression("+", l, r, core.intType);
    },
    Condition_sub(left, _minus, right) {
      const l = left.analyze();
      const r = right.analyze();
      checkType(l, core.intType, left);
      checkType(r, core.intType, right);
      return core.binaryExpression("-", l, r, core.intType);
    },
    Condition_term(term) {
      return term.analyze();
    },

    // --- Term ---
    // Term = Term "*" Factor --mul
    //      | Term "/" Factor --div
    //      | Term "%" Factor --mod
    //      | Factor
    Term_mul(left, _op, right) {
      const l = left.analyze();
      const r = right.analyze();
      checkType(l, core.intType, left);
      checkType(r, core.intType, right);
      return core.binaryExpression("*", l, r, core.intType);
    },
    Term_div(left, _op, right) {
      const l = left.analyze();
      const r = right.analyze();
      checkType(l, core.intType, left);
      checkType(r, core.intType, right);
      return core.binaryExpression("/", l, r, core.intType);
    },
    Term_mod(left, _op, right) {
      const l = left.analyze();
      const r = right.analyze();
      checkType(l, core.intType, left);
      checkType(r, core.intType, right);
      return core.binaryExpression("%", l, r, core.intType);
    },
    Term_factor(factor) {
      return factor.analyze();
    },

    // --- Factor ---
    // Factor = Primary ("**" Factor)? --exp
    //        | "-" Primary --neg
    //        | Primary
    Factor_exp(primary, _pow, factor) {
      const base = primary.analyze();
      const exponent = factor.analyze();
      checkType(base, core.intType, primary);
      checkType(exponent, core.intType, factor);
      return core.binaryExpression("**", base, exponent, core.intType);
    },
    Factor_neg(_minus, primary) {
      const p = primary.analyze();
      checkType(p, core.intType, primary);
      return core.unaryExpression("-", p, core.intType);
    },
    Factor_primary(primary) {
      return primary.analyze();
    },

    // --- Primary ---
    // Primary = floatLiteral
    //         | integerLiteral
    //         | boolean
    //         | ObjectMethodCall
    //         | StaticMethodCall
    //         | stringlit
    //         | id
    //         | FunctionCall
    //         | mathConstant
    //         | "[" ListOf<Exp, ","> "]" --array
    //         | "(" Exp ")" --parens
    Primary_floatLiteral(fl) {
      const value = parseFloat(fl.sourceString);
      return core.floatLiteral(value);
    },
    Primary_integerLiteral(il) {
      const value = parseInt(il.sourceString, 10);
      return core.integerLiteral(value);
    },
    Primary_boolean(b) {
      const val = b.sourceString === "true";
      return core.booleanLiteral(val);
    },
    Primary_stringlit(str) {
      const raw = str.sourceString;
      const value = raw.slice(1, -1);
      return core.stringLiteral(value);
    },
    Primary_ObjectMethodCall(call) {
      return call.analyze();
    },
    Primary_StaticMethodCall(call) {
      return call.analyze();
    },
    Primary_id(id) {
      const entity = context.lookup(id.sourceString);
      check(entity, `${id.sourceString} not declared`, id);
      return entity;
    },
    Primary_FunctionCall(call) {
      return call.analyze();
    },
    Primary_mathConstant(mc) {
      const name = mc.sourceString;
      return core.constant ? core.constant(name) : null;
    },
    Primary_array(_open, exps, _close) {
      const elements = exps.asIteration().children.map(e => e.analyze());
      if (elements.length > 0) {
        const firstType = elements[0].type;
        for (const e of elements) {
          check(e.type === firstType, `All array elements must have the same type`, _open);
        }
      }
      return core.arrayExpression(elements);
    },
    Primary_parens(_open, exp, _close) {
      return exp.analyze();
    },


    ExpList(...children) {
      return children.filter(child => child.ctorName !== "Comma").map(child => child.analyze());
    },

    FunctionCall(func, _open, optExpList, _close) {
      const name = func.sourceString;
      const args = optExpList.numChildren > 0 ? optExpList.analyze() : [];
      return core.mathFunctionCall(name, args);
    },

    
    FuncCreation(...children) {
  
      
      const idNode = children[1];
      const paramListNode = children[3];
      const optReturnType = children[5];
      const blockNode = children[6];
      check(!context.lookup(idNode.sourceString), `Function already declared: ${idNode.sourceString}`, idNode);
      const oldContext = context;
      context = context.newChildContext();
      let parameters = [];
      if (paramListNode.numChildren > 0) {
        parameters = paramListNode.analyze();
      }
      let returnType = core.voidType;
      if (optReturnType.numChildren > 0) {
        returnType = optReturnType.children[1].analyze();
      }
      parameters.forEach(param => {
        context.add(param.name, param);
      });
      const body = blockNode.analyze();
      context = oldContext;
      const fun = core.func(idNode.sourceString, parameters, body);
      fun.returnType = returnType;
      context.add(idNode.sourceString, fun);
      return core.functionDeclaration(fun);
    },

    

    ParamList(...children) {
      return children.filter(child => child.ctorName !== "Comma").map(child => child.analyze());
    },

    

    Param(...children) {
      const idNode = children[0];
      let type = core.anyType;
      if (children.length > 1 && children[1].numChildren > 0) {
        type = children[1].children[1].analyze();
      }
      return { name: idNode.sourceString, type };
    },


    
    VarArgsList(first, ...rest) {
      const result = [first.analyze()];
      rest.forEach(r => {
        result.push(r.children[1].analyze());
      });
      return result;
    },


    
    ObjectCreation(_obj, id, _eq, objType, _semi) {
      const typeName = objType.sourceString;
      const objectEntity = core.object(id.sourceString, typeName);
      context.add(id.sourceString, objectEntity);
      return core.objectDeclaration(objectEntity);
    },

  
    
    ObjectMethodCall(id, _dot, method, _open, optArgs, _close) {
      const objectEntity = context.lookup(id.sourceString);
      check(objectEntity, `${id.sourceString} not declared`, id);
      const methodName = method.sourceString;
      const args = optArgs && optArgs.numChildren > 0 ? optArgs.analyze() : [];
      return core.methodCall(objectEntity, methodName, args);
    },


    StaticMethodCall(objType, _dot, method, _open, optArgs, _close) {
      const typeName = objType.sourceString;
      const methodName = method.sourceString;
      const args = optArgs && optArgs.numChildren > 0 ? optArgs.analyze() : [];
      return core.staticMethodCall(typeName, methodName, args);
    },

    Type_int(_t) { return core.intType; },
    Type_float(_t) { return core.floatType; },
    Type_string(_t) { return core.stringType; },
    Type_bool(_t) { return core.booleanType; },
    Type_void(_t) { return core.voidType; },
    Type_any(_t) { return core.anyType; },
  });

  return semantics(match).analyze();
}

Number.prototype.type = "number";
Boolean.prototype.type = "bool";
String.prototype.type = "string";
