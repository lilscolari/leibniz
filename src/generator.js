export default function generate(program) {
  const output = ['const math = require(\'mathjs\');'];
  
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

      let semip, type, s1, s2, s3;

        if (o.objectType == "Triangle") {
          semip = (args[0] + args[1] + args[2]) / 2
          if (args[0] == args[1] && args[0] == args[2]) {
            type = "Equilateral"
          } else if (args[0] !== args[1] && args[0] !== args[2] && args[1] !== args[2]) {
            type = "Scalene"
          } else {
            type = "Isosceles"
          }
          s1 = parseInt(args[0], 10);
          s2 = parseInt(args[1], 10);
          s3 = parseInt(args[2], 10);
        }

        if (o.objectType == "Circle") {
          output.push(`let ${variableName} = {radius: ${args[0]}, area: function() {return ${Math.PI * args[0] ** 2}}, circumference: function() {return ${2 * Math.PI * args[0]}}};`);
        } else if (o.objectType == "Rectangle") {
          output.push(`let ${variableName} = {width: ${args[0]}, height: ${args[1]}, area: function() {return ${args[0] * args[1]}}, perimeter: function() {return ${2 * args[0] + 2 * args[1]}}};`);
        } else {
          output.push(`let ${variableName} = {side1: ${s1}, side2: ${s2}, side3: ${s3}, area: function() {return "sorry no functionality for area of triangle yet"}, perimeter: function() {return ${s1 + s2 + s3}}, type: function() {return ${type}}};`);
        }

    },
    CallExpression(e) {
      const mathFuncs = new Set(["sin", "cos", "tan", "sqrt", "log", "abs", "floor", "ceil", "round", "exp", "pow"]);
      const argsCode = e.args.map(gen).join(", ");
    
      if (mathFuncs.has(e.callee)) {
        return `Math.${e.callee}(${argsCode})`;
      } else if (e.callee == "arcsin" || e.callee == "arccos" || e.callee == "arctan"){
        return `${e.callee[0]}${e.callee.slice(3)}(${argsCode})`
      } else if (e.callee == "str") {
        return `${argsCode}.toString()`
      } else if (e.callee == "sort") {
        return `math.sort(${argsCode})`
      } else if (e.callee === "mean") {
        return `math.mean(${argsCode})`;
      } else if (e.callee === "median") {
        return `math.median(${argsCode})`;
      } else if (e.callee === "mode") {
        return `math.mode(${argsCode})[0]`;
      } else if (e.callee === "min") {
        return `math.min(${argsCode})`;
      } else if (e.callee === "max") {
        return `math.max(${argsCode})`;
      } else if (e.callee === "prod") {
        return `math.prod(${argsCode})`;
      } else if (e.callee === "sum") {
        return `math.sum(${argsCode})`;
      } else if (e.callee === "std") {
        return `math.std(${argsCode})`;
      } else if (e.callee === "variance") {
        return `math.variance(${argsCode})`;
      } else if (e.callee === "derivative") {
        return `math.derivative(${gen(e.args[0])}, ${gen(e.args[1])}).evaluate({${gen(e.args[1])[1]}: ${gen(e.args[2])}})`
      } else if (e.callee === "zeta") {
        return `math.zeta(${argsCode})`
      } else if (e.callee === "arandom") {
        return `math.pickRandom(${argsCode})`;
      } else if (e.callee === "perm") {
        return `math.permutations(${gen(e.args[0])}, ${gen(e.args[1])})`;
      } else if (e.callee === "choose") {
        return `math.combinations(${gen(e.args[0])}, ${gen(e.args[1])})`;
      } else if (e.callee === "rand") {
        return `math.random(${gen(e.args[0])}, ${gen(e.args[1])})`;
      } else if (e.callee === "randint") {
        return `math.randomInt(${gen(e.args[0])}, ${gen(e.args[1])})`;
      } else if (e.callee === "column") {
        return `math.column(${gen(e.args[0])}, ${gen(e.args[1])})`;
      } else if (e.callee === "count") {
        return `math.count(${argsCode})`;
      } else if (e.callee === "cross") {
        return `math.cross(${gen(e.args[0])}, ${gen(e.args[1])})`;
      } else if (e.callee === "det") {
        return `math.det(${argsCode})`;
      } else if (e.callee === "diag") {
        return `math.diag(${argsCode})`;
      } else if (e.callee === "dot") {
        return `math.dot(${gen(e.args[0])}, ${gen(e.args[1])})`;
      } else if (e.callee === "eigs") {
        return `math.eigs(${argsCode}).values`;
      } else if (e.callee === "identity") {
        return `math.identity(${argsCode})._data`;
      } else if (e.callee === "inv") {
        return `math.inv(${argsCode})`;
      } else if (e.callee === "ones") {
        return `math.ones(${argsCode})._data`;
      } else if (e.callee === "zeros") {
        return `math.zeros(${argsCode})._data`;
      } else if (e.callee === "arange") {
        return `math.range(${gen(e.args[0])}, ${gen(e.args[1])})._data`;
      } else if (e.callee === "transpose") {
        return `math.transpose(${argsCode})`;
      } else if (e.callee === "shape") {
        return `math.size(${argsCode})`;
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

    MatrixSubscriptExpression(e) {
      const variableName = gen(e.matrix);
      const index1 = gen(e.row);
      const index2 = gen(e.column);
      return `${variableName}[${index1}][${index2}]`
    },
    
    ForLoopStatement(s) {
      output.push(`for (let ${gen(s.loopVar)} = ${gen(s.start)}; ${gen(s.loopVar)} < ${gen(s.stop)}; ${gen(s.loopVar)} += ${gen(s.step)}) {`);
      s.body.statements.forEach(gen);
      output.push("}");
    },
    
    MethodCall(o) {
      const variableName = gen(o.object);
      const method = o.methodName;
      return `${variableName}.${method}()`;
    },

    MapOrFilterCall(o) {
      const array = gen(o.object);
      const method = o.methodName;
      const args = o.args.map(gen);
      
      return `${array}.${method}(x => ${gen(o.args[0])}(x))`;
    },
    
    // FilterExpression(e) {
    //   const array = gen(e.object);
    //   const predicate = gen(e.args[0]);
    //   return `${array}.filter(x => ${predicate})`;
    // },
    
    // MapExpression(e) {
    //   const array = gen(e.array);
    //   const transform = gen(e.transform);
    //   return `${array}.map(x => ${transform})`;
    // },

    MatrixExpression(e) {
      const elements = e.rows.map(gen).join(", ");
      return `[${elements}]`
    }
  };
    
  gen(program);
  return output.join("\n");
}