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

  // Current context for tracking variables
  let context = new Context();

  function check(condition, message, parseTreeNode) {
    if (!condition) {
      throw new Error(
        `${parseTreeNode.source.getLineAndColumnMessage()} ${message}`
      );
    }
  }

  // Type checking helpers
  function checkNumber(e, parseTreeNode) {
    check(
      e.type === "number" || e.type === "int" || e.type === "float",
      `Expected number type, got ${e.type}`,
      parseTreeNode
    );
  }

  function checkBoolean(e, parseTreeNode) {
    check(e.type === "boolean", `Expected boolean type, got ${e.type}`, parseTreeNode);
  }

  function checkString(e, parseTreeNode) {
    check(e.type === "string", `Expected string type, got ${e.type}`, parseTreeNode);
  }

  function checkNotDeclared(name, parseTreeNode) {
    check(
      !context.has(name),
      `Variable already declared: ${name}`,
      parseTreeNode
    );
  }

  function checkDeclared(name, parseTreeNode) {
    check(
      context.lookup(name),
      `Variable not declared: ${name}`,
      parseTreeNode
    );
  }

  function checkSameTypes(x, y, parseTreeNode) {
    check(
      x.type === y.type,
      `Type mismatch: ${x.type} and ${y.type}`,
      parseTreeNode
    );
  }

  function checkArrayElementTypes(elements, parseTreeNode) {
    if (elements.length > 0) {
      const type = elements[0].type;
      for (const e of elements) {
        check(
          e.type === type,
          `All elements must have the same type, expected ${type} but got ${e.type}`,
          parseTreeNode
        );
      }
    }
  }

  const analyzer = grammar.createSemantics().addOperation("analyze", {
    Program(statements) {
      return core.program(statements.children.map((s) => s.analyze()));
    },
    
    // Statement handling
    Stmt_increment(_inc, id, _semi) {
      const variable = id.analyze();
      checkNumber(variable, id);
      return core.incrementStatement(variable);
    },
    
    Stmt_decrement(_dec, id, _semi) {
      const variable = id.analyze();
      checkNumber(variable, id);
      return core.decrementStatement(variable);
    },
    
    VarDec(_let, id, _eq, exp, _semi) {
      checkNotDeclared(id.sourceString, id);
      const initializer = exp.analyze();
      const variable = core.variable(id.sourceString, initializer.type, true);
      context.add(id.sourceString, variable);
      return core.variableDeclaration(variable, initializer);
    },
    
    PrintStmt(_print, _open, exp, _close, _semi) {
      const argument = exp.analyze();
      return core.printStatement(argument);
    },
    
    AssignmentStmt(id, _eq, exp, _semi) {
      const source = exp.analyze();
      checkDeclared(id.sourceString, id);
      const target = id.analyze();
      checkSameTypes(source, target, id);
      return core.assignmentStatement(source, target);
    },
    
    IfStmt(_if, _openOptional, condition, _closeOptional, thenBlock, _elseOptional, elseBlock) {
      const test = condition.analyze();
      checkBoolean(test, condition);
      const consequent = thenBlock.analyze();
      const alternate = elseBlock.children[0] ? elseBlock.children[0].analyze() : null;
      return core.ifStatement(test, consequent, alternate);
    },
    
    ForLoop(_for, id, _in, _domain, _open, count, _close, block) {
      const countExp = count.analyze();
      checkNumber(countExp, count);
      
      // New scope for the loop variable
      const outerContext = context;
      context = context.newChildContext();
      
      // Add the loop variable to the context
      const loopVar = core.variable(id.sourceString, "int", false);
      context.add(id.sourceString, loopVar);
      
      const body = block.analyze();
      
      // Restore the outer context
      context = outerContext;
      
      return core.forLoop(loopVar, countExp, body);
    },
    
    Block(_open, statements, _close) {
      // Create a new context for blocks
      const outerContext = context;
      context = context.newChildContext();
      
      const stmts = statements.children.map(s => s.analyze());
      
      // Restore outer context
      context = outerContext;
      
      return core.block(stmts);
    },
    
    // Expression handling
    Exp_test(left, op, right) {
      const x = left.analyze();
      const y = right.analyze();
      
      if (op.sourceString === "==" || op.sourceString === "!=") {
        // For equality operators, types must match
        checkSameTypes(x, y, op);
      } else {
        // For comparison operators (<, >, etc.), operands must be numeric
        checkNumber(x, left);
        checkNumber(y, right);
      }
      
      return core.binaryExpression(op.sourceString, x, y, "boolean");
    },
    
    Condition_add(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      
      if (x.type === "string" || y.type === "string") {
        // String concatenation
        return core.binaryExpression("+", x, y, "string");
      } else {
        // Numeric addition
        checkNumber(x, left);
        checkNumber(y, right);
        
        // Determine result type (float or int)
        const resultType = (x.type === "float" || y.type === "float") ? "float" : "int";
        return core.binaryExpression("+", x, y, resultType);
      }
    },
    
    Condition_sub(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      
      // Determine result type (float or int)
      const resultType = (x.type === "float" || y.type === "float") ? "float" : "int";
      return core.binaryExpression("-", x, y, resultType);
    },
    
    Term_mul(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      
      // Determine result type (float or int)
      const resultType = (x.type === "float" || y.type === "float") ? "float" : "int";
      return core.binaryExpression("*", x, y, resultType);
    },
    
    Term_div(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      
      // Division always produces float
      return core.binaryExpression("/", x, y, "float");
    },
    
    Term_mod(left, _op, right) {
      const x = left.analyze();
      const y = right.analyze();
      checkNumber(x, left);
      checkNumber(y, right);
      
      // Modulo with integers produces int, with floats produces float
      const resultType = (x.type === "float" || y.type === "float") ? "float" : "int";
      return core.binaryExpression("%", x, y, resultType);
    },
    
    Factor_exp(primary, _op, factor) {
      const base = primary.analyze();
      const exponent = factor ? factor.analyze() : null;
      
      if (exponent) {
        checkNumber(base, primary);
        checkNumber(exponent, factor);
        
        // Exponentiation usually produces float except in special cases
        return core.binaryExpression("**", base, exponent, "float");
      }
      
      return base;
    },
    
    Factor_neg(_op, operand) {
      const expr = operand.analyze();
      checkNumber(expr, operand);
      return core.unaryExpression("-", expr, expr.type);
    },
    
    Primary_parens(_open, exp, _close) {
      return exp.analyze();
    },
    
    Primary_array(_open, elements, _close) {
      const analyzedElements = elements.asIteration().children.map(e => e.analyze());
      checkArrayElementTypes(analyzedElements, elements);
      
      const elementType = analyzedElements.length > 0 ? analyzedElements[0].type : "any";
      return core.arrayExpression(analyzedElements, `${elementType}[]`);
    },
    
    // Literal handling
    integerLiteral(_digits) {
      return core.literalExpression(Number(this.sourceString), "int");
    },
    
    floatLiteral(_) {
      return core.literalExpression(Number(this.sourceString), "float");
    },
    
    boolean(value) {
      return core.literalExpression(value.sourceString === "true", "boolean");
    },
    
    stringlit(_open, chars, _close) {
      return core.literalExpression(chars.sourceString, "string");
    },
    
    // Math constants
    mathConstant(constant) {
      const value = constant.sourceString;
      let numericValue;
      
      if (value === "pi" || value === "π") {
        numericValue = Math.PI;
      } else if (value === "e") {
        numericValue = Math.E;
      }
      
      return core.literalExpression(numericValue, "float");
    },
    
    // Identifier resolution
    id(_first, _rest) {
      const entity = context.lookup(this.sourceString);
      check(entity, `${this.sourceString} not declared`, this);
      return entity;
    }
  });

  return analyzer(match).analyze();
}

// Extend prototype for primitives
Number.prototype.type = "number";
Boolean.prototype.type = "boolean";
String.prototype.type = "string";