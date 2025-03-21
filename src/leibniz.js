const fs = require('fs');
const { compile } = require('./compiler');

if (process.argv.length < 3) {
  console.error('Usage: node leibniz.js <source_file>');
  process.exit(1);
}

const sourceCode = fs.readFileSync(process.argv[2], 'utf8');
const output = compile(sourceCode);

console.log('Compiled Output:');
console.log(output);
