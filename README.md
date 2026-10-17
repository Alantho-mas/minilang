# MiniLang

A tiny programming language anyone can learn in 5 minutes — tokenizer, parser, and interpreter in a single file of vanilla JavaScript. No libraries, no shortcuts.

There are only **six things to learn**:

| What | How | Example |
| ---- | --- | ------- |
| Store a value | `name = value` | `x = 10` |
| Show something | `print something` | `print "Hello"` |
| Decide | `if ... otherwise ... end` | `if age bigger than 18` |
| Repeat | `repeat N times ... end` | `repeat 3 times` |
| Reuse | `recipe ... end`, then use it | `recipe greet name` |
| Group things | `[item, item]` | `fruits = ["apple", "banana"]` |

That's the whole language. No `let`, no semicolons, no symbols for comparisons — just plain words.

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

```python
# recipes.ml
recipe greet name
  print "Hello, " + name + "!"
end

greet "Alan"

recipe add a b
  give back a + b
end

print add 2 3
```

```python
# lists.ml
fruits = ["apple", "banana", "mango"]
print fruits[0]      # apple — positions start at 0
print fruits + ["grapes"]
```

Run it on a file:

```bash
node minilang.js examples/hello.ml
```

Or just run `node minilang.js` with no file to type MiniLang live:

```
$ node minilang.js
minilang> x = 10
minilang> print x * 2
20
minilang> if x bigger than 5
... print "big"
... end
big
minilang> 2 + 3
5
```

In interactive mode, type `help` for a cheat sheet and `exit` to leave. Blocks like `if` and `recipe` span multiple lines — MiniLang waits patiently with `... ` until you finish with `end`.

## The Details (for the curious)

- **Math:** `+  -  *  /  %`, brackets `( )`, minus for negatives — with correct precedence, so `2 + 3 * 4` is `14`.
- **Words** go in `"quotes"`. `+` joins words: `"Hi " + name`.
- **Comments** start with `#`.
- **Decisions:** `if x bigger than 5` ... `otherwise` ... `end`. Comparisons are plain words: `bigger than`, `smaller than`, `equals`, `not equals`.
- **Loops:** `repeat 3 times` ... `end`. Blocks can nest inside each other.
- **Recipes:** bundle steps under a name and reuse them. `recipe add a b` ... `give back a + b` ... `end`, then `add 2 3`. Recipes can even call themselves.
- **Lists:** `fruits = ["apple", "banana"]`, look inside with `fruits[0]`, join with `+`.
- Mistakes get friendly errors that teach you, e.g. writing `let x = 5` tells you: *"No 'let' needed in MiniLang — just write: x = 5"*.

## How It Works

```
source code  →  tokenizer  →  tokens  →  parser  →  AST  →  interpreter  →  output
```

1. **Tokenizer** — scans characters into tokens (numbers, words in quotes, names, `print`, operators). Tracks line numbers for error messages.
2. **Parser** — recursive descent over the grammar, builds an Abstract Syntax Tree. Operator precedence comes from the classic `expr → term → factor` chain.
3. **Interpreter** — walks the tree, evaluates each piece, remembers variables in a persistent session (that's what makes interactive mode work). Catches mistakes like unknown names or dividing by zero.

## Grammar

```
program    := (statement newline*)*
statement  := IDENT "=" expr | "print" expr | ifStmt | repeatStmt
             | recipeDef | "give" "back" expr | callStmt
callStmt   := IDENT arg*              (a name followed by values is a call)
ifStmt     := "if" expr newline block ("otherwise" newline block)? "end"
repeatStmt := "repeat" expr "times" newline block "end"
recipeDef  := "recipe" IDENT IDENT* newline block "end"
block      := (statement newline*)*
expr       := comparison
comparison := additive ((bigger than | smaller than | equals | not equals) additive)*
additive   := term (("+" | "-") term)*
term       := factor (("*" | "/" | "%") factor)*
factor     := "-" factor | primary
primary    := NUMBER | STRING | IDENT | callExpr | "(" expr ")"
             | "[" (expr ("," expr)*)? "]" | primary "[" expr "]"
callExpr   := IDENT arg+
```

## Try It

```bash
node minilang.js examples/hello.ml      # words & variables
node minilang.js examples/math.ml       # maths & brackets
node minilang.js examples/conditions.ml # if / otherwise
node minilang.js examples/loop.ml       # repeat loops
node minilang.js examples/recipes.ml    # reusable recipes
node minilang.js examples/lists.ml      # lists
```

Or skip files entirely: run `node minilang.js` and type away.

## Project Structure

```
├── minilang.js      # the whole language: tokenizer, parser, interpreter, REPL
├── examples/
│   ├── hello.ml     # words & variables
│   ├── math.ml      # maths & brackets
│   ├── conditions.ml# if / otherwise decisions
│   ├── loop.ml      # repeat loops
│   ├── recipes.ml   # reusable recipes (functions)
│   └── lists.ml     # lists
└── README.md
```

## Roadmap

- ✅ **Stage 1:** values, variables, print, maths
- ✅ **Stage 2:** decisions (`if`/`otherwise`) and loops (`repeat`), all in plain words
- ✅ **Stage 3:** reusable `recipe` blocks (functions) with `give back`, and lists
- ✅ **Stage 4:** interactive mode — type MiniLang live and see results instantly

## Tech Stack

- Vanilla JavaScript (Node.js) — no dependencies
