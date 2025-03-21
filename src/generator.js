function generate(ast) {
    if (ast.type === 'Program') {
      return ast.body.map(generate).join('\n');
    }
    if (ast.type === 'Print') {
      return `console.log(${generate(ast.value)});`;
    }
    if (ast.type === 'Assignment') {
      return `let ${ast.name} = ${generate(ast.value)};`;
    }
    if (ast.type === 'Number' || ast.type === 'Boolean' || ast.type === 'String') {
      return JSON.stringify(ast.value);
    }
    return ast;
  }
  
  module.exports = { generate };
  