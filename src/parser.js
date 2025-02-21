import * as fs from "node:fs"
import * as ohm from "ohm-js"

const grammar = ohm.grammar(fs.readFileSync("src/leibniz.ohm"))

// Returns the Ohm match if successful, otherwise throws an error
export default function parse(sourceCode) {
  const match = grammar.match(sourceCode)

  if (!match.succeeded()) {
    console.error("Parsing failed at:", match.message)
    throw new Error(match.message)
  }

  console.log("Parsing succeeded.")
  return match
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const testCases = [
    `let x = 5;`,
    `print(x);`,
    `let y = sin(3.14);`,
    'let z = 3 + 2 * 5;'
    'let p = sqrt(4);'
  ]

  for (const code of testCases) {
    try {
      console.log(`\nTesting: ${code}`)
      parse(code)
    } catch (error) {
      console.error("Error:", error.message)
    }
  }
}
