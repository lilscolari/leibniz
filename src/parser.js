import * as fs from "node:fs"
import * as ohm from "ohm-js"

const ohm = require('ohm-js');
const fs = require('fs');

const grammar = fs.readFileSync(__dirname + '/leibniz.ohm', 'utf8');
const leibnizGrammar = ohm.grammar(grammar);
const semantics = leibnizGrammar.createSemantics();

semantics.addOperation('ast', {
  Program(stmtList) {
    return { type: 'Program', body: stmtList.ast() };
  },
  PrintStmt(_print, _open, exp, _close, _semi) {
    return { type: 'Print', value: exp.ast() };
  },
  AssignmentStmt(id, _eq, exp, _semi) {
    return { type: 'Assignment', name: id.ast(), value: exp.ast() };
  },
  id(_first, _rest) {
    return this.sourceString;
  },
  integerLiteral(_digits) {
    return { type: 'Number', value: Number(this.sourceString) };
  },
  floatLiteral(_digits, _dot, _frac) {
    return { type: 'Number', value: parseFloat(this.sourceString) };
  },
  boolean(value) {
    return { type: 'Boolean', value: this.sourceString === 'true' };
  },
  stringlit(_open, chars, _close) {
    return { type: 'String', value: chars.sourceString };
  },
  _terminal() {
    return this.sourceString;
  }
});

function parse(code) {
  const match = leibnizGrammar.match(code);
  if (match.failed()) throw new Error(`Syntax Error: ${match.message}`);
  return semantics(match).ast();
}

module.exports = { parse };
