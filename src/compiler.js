const { parse } = require('./parser');
const { analyze } = require('./analyzer');
const { optimize } = require('./optimizer');
const { generate } = require('./generator');

function compile(sourceCode) {
  const ast = parse(sourceCode);
  const analyzedAst = analyze(ast);
  const optimizedAst = optimize(analyzedAst);
  return generate(optimizedAst);
}

module.exports = { compile };
