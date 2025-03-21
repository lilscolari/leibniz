function analyze(ast) {
  if (ast.type === 'Program') {
    return { type: 'Program', body: ast.body.map(analyze) };
  }
  if (ast.type === 'Print') {
    return { type: 'Print', value: analyze(ast.value) };
  }
  if (ast.type === 'Assignment') {
    return { type: 'Assignment', name: ast.name, value: analyze(ast.value) };
  }
  return ast;
}

module.exports = { analyze };
