export default function generate(program) {
  const output = [];
  
  const targetName = ((mapping) => {
    return (entity) => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1);
      }
      return `${entity.name}_${mapping.get(entity)}`;
    };
  })(new Map());

  const gen = (node) => {
    if (node == null) return "";
  
    // If node is a plain literal-like object (no `kind`), return its value
    if (typeof node === "object" && "value" in node && "type" in node) {
      if (node.type === "string") {
        return `"${node.value}"`;
      }
      return `${node.value}`;
    }
  
    return generators?.[node?.kind]?.(node) ?? node;
  };

  const generators = {
    // Key idea: when generating an expression, just return the JS string; when
    // generating a statement, write lines of translated JS to the output array.
    Program(p) {
      p.statements.forEach(gen);
    },
    VariableDeclaration(d) {
      output.push(`let ${gen(d.variable)} = ${gen(d.initializer)};`);
    },
    WhileStatement(s) {
      output.push(`while (${gen(s.test)}) {`)
      s.body.statements.forEach(gen)
      output.push("}")
    },
    Variable(v) {
      return targetName(v);
    },
    Function(f) {
      return targetName(f);
    },
    IncrementStatement(s) {
      output.push(`${gen(s.variable)}++;`);
    },
    DecrementStatement(s) {
      output.push(`${gen(s.variable)}--;`)
    },
    AssignmentStatement(s) {
      output.push(`${gen(s.target)} = ${gen(s.source)};`);
    },
    BreakStatement(s) {
      output.push("break;");
    },
    ReturnStatement(s) {
      output.push(`return ${gen(s.expression)};`);
    },
    IfStatement(s) {
      output.push(`if (${gen(s.test)}) {`);
      s.consequent.statements.forEach(gen);
      if (s.alternate?.kind?.endsWith?.("IfStatement")) {
        output.push("} else");
        gen(s.alternate);
      } else {
        if (s.alternate != null) {
          output.push("} else {");
          s.alternate.statements.forEach(gen);
          output.push("}");
        } else {
          output.push("}")
        }
      }
    },
    BinaryExpression(e) {
      const op = { "==": "===", "!=": "!==" }[e.op] ?? e.op;
      return `${gen(e.left)} ${op} ${gen(e.right)}`;
    },
    UnaryExpression(e) {
      const operand = gen(e.operand);
      if (e.op === "#") {
        return `${operand}.length`;
      }
      return `${e.op}(${operand})`;
    },
    PrintStatement(s) {
      output.push(`console.log(${gen(s.argument)});`)
    },
    ObjectCreation(o) {
      const args = o.args.map(gen); 
      const variableName = gen(o.variable);

      if (o.objectType == "Circle") {
        output.push(`let ${variableName} = {radius: ${args[0]}};`);
      } else if (o.objectType == "Rectangle") {
        output.push(`let ${variableName} = {width: ${args[0]}, height: ${args[1]}};`);
      } else {
        output.push(`let ${variableName} = {side1: ${args[0]}, side2: ${args[1]}, side3: ${args[2]}};`);
      }
    },
    CallExpression(e) {
      const mathFuncs = new Set(["sin", "cos", "tan", "sqrt", "log", "abs", "floor", "ceil", "round", "exp"]);
      const argsCode = e.args.map(gen).join(", ");
    
      if (mathFuncs.has(e.callee)) {
        return `Math.${e.callee}(${argsCode})`;
      } else if (e.callee == "arcsin" || e.callee == "arccos" || e.callee == "arctan"){
        return `Math.a${e.callee.slice(3)}(${argsCode})`
      } else if (e.callee == "str") {
        return `${argsCode}.toString()`
      }
    
      // Fallback for user-defined or unknown functions
      return `${gen(e.callee)}(${argsCode})`;
    },

    FunctionDeclaration(d) {
      const functionName = gen(d.fun);
      const paramNames = d.fun.parameters.map(param => gen(param));
    
      output.push(`function ${functionName}(${paramNames.join(", ")}) {`);
      
      for (const stmt of d.body.statements) {
        gen(stmt);
      }
      output.push("}");
    },

    ArrayExpression(e) {
      const elements = e.elements.map(gen).join(", ");
      return `[${elements}]`
    }, 
    
    SubscriptExpression(e) {
      const variableName = gen(e.array);
      const index = gen(e.index);
      return `${variableName}[${index}]`
    },
    
    ForLoopStatement(s) {
      const upperBound = gen(s.upperBound);
      output.push(`for (let ${gen(s.loopVar)} = 0; ${gen(s.loopVar)} < ${upperBound}; ${gen(s.loopVar)}++) {`);
      s.body.statements.forEach(gen);
      output.push("}");
    },
    
    MethodCall(o) {
      const variableName = gen(o.object);
      const method = o.methodName;
      return `${variableName}.${method}()`;
    },
    
    FilterExpression(e) {
      const array = gen(e.array);
      const predicate = gen(e.predicate);
      return `${array}.filter(x => ${predicate})`;
    },
    
    MapExpression(e) {
      const array = gen(e.array);
      const transform = gen(e.transform);
      return `${array}.map(x => ${transform})`;
    }
  };
    
  gen(program);
  return output.join("\n");
}