# MiniLang

A tiny programming language anyone can learn in 5 minutes — tokenizer, parser, and interpreter in a single file of vanilla JavaScript. No libraries, no shortcuts.

There are only **two things to learn**:

| What | How | Example |
| ---- | --- | ------- |
| Store a value | `name = value` | `x = 10` |
| Show something | `print something` | `print "Hello"` |

That's it. No `let`, no semicolons, one statement per line.

```python
# hello.ml
name = "Alan"
print "Hello, " + name + "!"
```

Run it:

```bash
node minilang.js examples/hello.ml
```

## The Details (for the curious)

- **Math:** `+  -  *  /  %`, brackets `( )`, minus for negatives — with correct precedence, so `2 + 3 * 4` is `14`.
- **Words** go in `"quotes"`. `+` joins words: `"Hi " + name`.
- **Comments** start with `#`.
- Mistakes get friendly errors that teach you, e.g. writing `let x = 5` tells you: *"No 'let' needed in MiniLang — just write: x = 5"*.

## How It Works

```
source code  →  tokenizer  →  tokens  →  parser  →  AST  →  interpreter  →  output
```

1. **Tokenizer** — scans characters into tokens (numbers, words in quotes, names, `print`, operators). Tracks line numbers for error messages.
2. **Parser** — recursive descent over the grammar, builds an Abstract Syntax Tree. Operator precedence comes from the classic `expr → term → factor` chain.
3. **Interpreter** — walks the tree, evaluates each piece, remembers variables. Catches mistakes like unknown names or dividing by zero.

## Grammar

```
program   := (statement newline*)*
statement := IDENT "=" expr | "print" expr
expr      := term (("+" | "-") term)*
term      := factor (("*" | "/" | "%") factor)*
factor    := "-" factor | primary
primary   := NUMBER | STRING | IDENT | "(" expr ")"
```

## Try It

```bash
node minilang.js examples/hello.ml   # words & variables
node minilang.js examples/math.ml    # maths & brackets
```

## Project Structure

```
├── minilang.js      # the whole language: tokenizer, parser, interpreter
├── examples/
│   ├── hello.ml     # words & variables
│   └── math.ml      # maths & brackets
└── README.md
```

## Roadmap

- **Stage 2:** comparisons (`bigger than`, `smaller than`, `equals`), `if`/`otherwise`, `repeat` loops — all in plain words
- **Stage 3:** reusable `recipe` blocks (functions)
- **Stage 4:** interactive mode — type and see results instantly

## Tech Stack

- Vanilla JavaScript (Node.js) — no dependencies
