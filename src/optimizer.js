function optimize(ast) {
    if (ast.type === 'Program') {
      return { type: 'Program', body: ast.body.map(optimize) };
    }
    if (ast.type === 'Assignment' && ast.value.type === 'Number') {
      return { type: 'Assignment', name: ast.name, value: ast.value };
    }
    return ast;
  }
  
  module.exports = { optimize };
  