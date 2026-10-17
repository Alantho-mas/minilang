# MiniLang

A tiny programming language anyone can learn in 5 minutes — tokenizer, parser, and interpreter in a single file of vanilla JavaScript. No libraries, no shortcuts.

There are only **four things to learn**:

| What | How | Example |
| ---- | --- | ------- |
| Store a value | `name = value` | `x = 10` |
| Show something | `print something` | `print "Hello"` |
| Decide | `if ... otherwise ... end` | `if age bigger than 18` |
| Repeat | `repeat N times ... end` | `repeat 3 times` |

That's it. No `let`, no semicolons, no symbols for comparisons — just plain words.

```python
# hello.ml
name = "Alan"
print "Hello, " + name + "!"
```

```python
# decisions.ml
if age bigger than 18
  print "adult"
otherwise
  print "young"
end
```

Run it:

```bash
node minilang.js examples/hello.ml
```

## The Details (for the curious)

- **Math:** `+  -  *  /  %`, brackets `( )`, minus for negatives — with correct precedence, so `2 + 3 * 4` is `14`.
- **Words** go in `"quotes"`. `+` joins words: `"Hi " + name`.
- **Comments** start with `#`.
- **Decisions:** `if x bigger than 5` ... `otherwise` ... `end`. Comparisons are plain words: `bigger than`, `smaller than`, `equals`, `not equals`.
- **Loops:** `repeat 3 times` ... `end`. Blocks can nest inside each other.
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
program    := (statement newline*)*
statement  := IDENT "=" expr | "print" expr | ifStmt | repeatStmt
ifStmt     := "if" expr newline block ("otherwise" newline block)? "end"
repeatStmt := "repeat" expr "times" newline block "end"
block      := (statement newline*)*
expr       := comparison
comparison := additive ((bigger than | smaller than | equals | not equals) additive)*
additive   := term (("+" | "-") term)*
term       := factor (("*" | "/" | "%") factor)*
factor     := "-" factor | primary
primary    := NUMBER | STRING | IDENT | "(" expr ")"
```

## Try It

```bash
node minilang.js examples/hello.ml   # words & variables
node minilang.js examples/math.ml    # maths & brackets
node minilang.js examples/conditions.ml  # if / otherwise
node minilang.js examples/loop.ml    # repeat loops
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

- ✅ **Stage 1:** values, variables, print, maths
- ✅ **Stage 2:** decisions (`if`/`otherwise`) and loops (`repeat`), all in plain words
- **Stage 3:** reusable `recipe` blocks (functions), lists
- **Stage 4:** interactive mode — type and see results instantly

## Tech Stack

- Vanilla JavaScript (Node.js) — no dependencies
