export default function generate(program) {
    // When generating code for statements, we'll accumulate the lines of
    // the target code here. When we finish generating, we'll join the lines
    // with newlines and return the result.
    const output = [];
  
    // Variable and function names in JS will be suffixed with _1, _2, _3,
    // etc. This is because "switch", for example, is a legal name in Carlos,
    // but not in JS. So, the Carlos variable "switch" must become something
    // like "switch_1". We handle this by mapping each name to its suffix.
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

        // We don't care about const vs. let in the generated code! The analyzer has
        // already checked that we never updated a const, so let is always fine.
        output.push(`let ${gen(d.variable)} = ${gen(d.initializer)};`);
      }, 
      // ForStatement(s) {
      //   const range = Array.from({ length: gen(s.range) }, (_, i) => i);
      //   output.push(`for (let ${gen(s.iterator)} of [${range}]) {`)
      //   s.body.statements.forEach(gen)
      //   output.push("}")
      // },
      WhileStatement(s) {
        output.push(`while (${gen(s.test)} {`)
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
      // ReturnStatement(s) {
      //   output.push(`return ${gen(s.expression)};`);
      // },
      // ShortReturnStatement(s) {
      //   output.push("return;");
      // },
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
        // if (e.op === "#") {
        //   return `${operand}.length`;
        // }
        return `${e.op}(${operand})`;
      },
      // SubscriptExpression(e) {
      //   return `${gen(e.array)}[${gen(e.index)}]`;
      // },
      // ArrayExpression(e) {
      //   return `[${e.elements.map(gen).join(",")}]`;
      // },
      // FunctionCall(c) {
      //   const targetCode = standardFunctions.has(c.callee)
      //     ? standardFunctions.get(c.callee)(c.args.map(gen))
      //     : `${gen(c.callee)}(${c.args.map(gen).join(", ")})`;
      //   // Calls in expressions vs in statements are handled differently
      //   if (c.callee.type.returnType !== voidType) {
      //     return targetCode;
      //   }
      //   output.push(`${targetCode};`);
      // },
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
      // ObjectMethodCall(o) {
      //   const variableName = gen(o.object);
      //   const method = o.method
      //   return `${variableName}.${method}()`
      // },
      // MathConstant(c) {
      //   if (c.name === "pi" || c.name === "π") {
      //     return "Math.PI";
      //   } else if (c.name === "e") {
      //     return "Math.E";
      //   }
      // },
      CallExpression(e) {
        const mathFuncs = new Set(["sin", "cos", "tan", "sqrt", "log", "abs", "floor", "ceil", "round", "exp", "min", "max"]);
        //console.log(e)
        const argsCode = e.args.map(gen).join(", ");
      
        if (mathFuncs.has(e.callee)) {
          return `Math.${e.callee}(${argsCode})`;
        } else if (e.callee == "arcsin" || e.callee == "arccos" || e.callee == "arctan"){
          return `${e.callee[0]}${e.callee.slice(3)}(${argsCode})`
        }
      
        // Fallback for user-defined or unknown functions
        return `${gen(e.callee)}(${argsCode})`;
      },

      // Returns extra [Object] line when additional statements
      FunctionDeclaration(d) {
        const functionName = gen(d.fun);
        const paramNames = d.fun.parameters.flat().map(param => gen(param));

        const returnLine = `return ${gen(d.body.returnExp)};`;
      
        output.push(`function ${functionName}(${paramNames.join(", ")}) {`);
        
        for (const stmt of d.body.statements) {
          gen(stmt);
        }
        output.push(`${returnLine}`);
        output.push("}");
      },
      // FunctionBody(e) {
      //   const returnLine = `return ${gen(e.returnExpression)};`;
      //   return `${returnLine}`;
      // },
      // IntegerLiteral(number) {
      //   return `${gen(number)}`;
      // },
      // FloatLiteral(number) {
      //   return `${gen(number)}`;
      // },
      // DerivativeCall(derivative) {
      //   return `derivative("${gen(derivative.func)}", "${gen(derivative.variable)}", ${gen(derivative.evaluatedAt)})`
      // },
      ForLoopStatement(s) {
        const range = Array.from({ length: gen(s.upperBound) }, (_, i) => i);
        output.push(`for (let ${gen(s.loopVar)} of [${range}]) {`)
        s.body.statements.forEach(gen)
        output.push("}")
      },
      MethodCall(o) {
        const variableName = gen(o.object);
        const method = o.methodName;
        const argsCode = o.args.map(gen).join(", ");
        if (argsCode.length === 0) {
          return `${variableName}.${method}()`;
        } 
        // else {
        //   return `${variableName}.${method}(${argsCode})`;
        // }
      }, ArrayExpression(e) {
        const elements = e.elements.map(gen).join(", ");
        return `[${elements}]`
      }, SubscriptExpression(e) {
        const variableName = gen(e.array);
        const index = gen(e.index);
        return `${variableName}[${index}]`
      }

    };
    
    gen(program);
    return output.join("\n");
  }