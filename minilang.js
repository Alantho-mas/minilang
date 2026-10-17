#!/usr/bin/env node
'use strict';
/*
 * MiniLang — a tiny programming language anyone can learn in 5 minutes.
 *
 * Stage 1: store values (x = 10), show things (print "hi"), maths.
 * Stage 2: decisions (if/otherwise/end) and loops (repeat/end) in plain words.
 * Stage 3: reusable recipes (functions) with "give back", and lists.
 *
 *   recipe greet name
 *     print "Hello, " + name + "!"
 *   end
 *
 *   greet "Alan"
 *
 *   recipe add a b
 *     give back a + b
 *   end
 *
 *   print add 2 3
 *
 *   fruits = ["apple", "banana"]
 *   print fruits[0]
 *
 * Usage: node minilang.js <file.ml>
 */

const fs = require('fs');

// ---------------- Tokenizer ----------------
const KEYWORDS = ['let', 'print', 'if', 'otherwise', 'end', 'repeat', 'times',
                  'bigger', 'smaller', 'than', 'equals', 'not',
                  'recipe', 'give', 'back'];

function tokenize(src) {
  const tokens = [];
  let i = 0, line = 1;
  const isDigit = (c) => c >= '0' && c <= '9';
  const isAlpha = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  const at = (msg) => `${msg} (line ${line})`;

  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { tokens.push({ type: 'newline', line }); line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === ';') { i++; continue; }
    if (c === '#' || (c === '/' && src[i + 1] === '/')) {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }

    if (isDigit(c)) {
      let j = i, dots = 0;
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) {
        if (src[j] === '.') dots++;
        j++;
      }
      if (dots > 1) throw new Error(at('Bad number'));
      tokens.push({ type: 'number', value: parseFloat(src.slice(i, j)), line });
      i = j; continue;
    }

    if (c === '"') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\n') line++;
        if (src[j] === '\\' && j + 1 < src.length) {
          const n = src[j + 1];
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n === '"' ? '"' : n;
          j += 2;
        } else { s += src[j]; j++; }
      }
      if (j >= src.length) throw new Error(at('Unterminated string — did you forget the closing " ?'));
      tokens.push({ type: 'string', value: s, line });
      i = j + 1; continue;
    }

    if (isAlpha(c)) {
      let j = i;
      while (j < src.length && (isAlpha(src[j]) || isDigit(src[j]))) j++;
      const word = src.slice(i, j);
      tokens.push({ type: KEYWORDS.includes(word) ? 'keyword' : 'ident', value: word, line });
      i = j; continue;
    }

    if ('+-*/%()=;[],'.includes(c)) { tokens.push({ type: 'op', value: c, line }); i++; continue; }
    throw new Error(at(`I don't understand '${c}' — MiniLang only uses plain words, "quotes" and + - * / % ( ) = [ ] ,`));
  }
  tokens.push({ type: 'eof', line });
  return tokens;
}

// ---------------- Parser ----------------
// program    := (statement newline*)*
// statement  := IDENT "=" expr | "print" expr | ifStmt | repeatStmt
//             | recipeDef | "give" "back" expr | callStmt
// callStmt   := IDENT arg*
// arg        := additive   (a value: number, "word", name, (bracket), -5)
// ifStmt     := "if" expr newline block ("otherwise" newline block)? "end"
// repeatStmt := "repeat" expr "times" newline block "end"
// recipeDef  := "recipe" IDENT IDENT* newline block "end"
// block      := (statement newline*)*
// expr       := comparison
// comparison := additive ((bigger than | smaller than | equals | not equals) additive)*
// additive   := term (("+" | "-") term)*
// term       := factor (("*" | "/" | "%") factor)*
// factor     := "-" factor | primary
// primary    := NUMBER | STRING | IDENT | callExpr | "(" expr ")"
//             | "[" (expr ("," expr)*)? "]" | primary "[" expr "]"
// callExpr   := IDENT arg+   (an IDENT followed by a value starts a call)

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const peek2 = () => tokens[pos + 1];
  const next = () => tokens[pos++];
  const isKw = (t, w) => t.type === 'keyword' && t.value === w;
  const isOp = (t, v) => t.type === 'op' && t.value === v;

  function endOfLine() {
    const n = peek();
    if (n.type === 'newline') { next(); return; }
    if (n.type === 'eof') return;
    throw new Error(`One statement per line, please (line ${n.line})`);
  }

  function expectNewline(kw, what) {
    const n = peek();
    if (n.type !== 'newline') {
      throw new Error(`Put ${what} on the next line (line ${kw.line})`);
    }
    next();
  }

  function expectEnd(kw, what) {
    const endTok = peek();
    if (!isKw(endTok, 'end')) {
      throw new Error(`A '${what}' needs 'end' at the finish (line ${kw.line})`);
    }
    next();
    endOfLine();
  }

  function parseProgram() {
    const stmts = [];
    while (peek().type === 'newline') next();
    while (peek().type !== 'eof') {
      stmts.push(parseStatement());
      while (peek().type === 'newline') next();
    }
    return { kind: 'program', stmts };
  }

  function parseBlock() {
    const stmts = [];
    while (peek().type === 'newline') next();
    for (;;) {
      const t = peek();
      if (t.type === 'eof') throw new Error("Missing 'end' — every 'if', 'repeat' and 'recipe' needs one at the finish");
      if (t.type === 'keyword' && (t.value === 'end' || t.value === 'otherwise')) break;
      stmts.push(parseStatement());
      while (peek().type === 'newline') next();
    }
    return stmts;
  }

  function parseStatement() {
    const t = peek();
    if (t.type === 'keyword') {
      if (t.value === 'let') {
        throw new Error(`No 'let' needed in MiniLang (line ${t.line}) — just write:  x = 5`);
      }
      if (t.value === 'print') {
        next();
        const expr = parseExpr();
        endOfLine();
        return { kind: 'print', expr };
      }
      if (t.value === 'if') return parseIf();
      if (t.value === 'repeat') return parseRepeat();
      if (t.value === 'recipe') return parseRecipe();
      if (t.value === 'give' && isKw(peek2(), 'back')) {
        next(); next();
        const expr = parseExpr();
        endOfLine();
        return { kind: 'giveback', expr };
      }
      throw new Error(`'${t.value}' is a special MiniLang word — use another name (line ${t.line})`);
    }
    if (t.type === 'ident') {
      const name = next().value;
      if (isOp(peek(), '=')) {
        next();
        const expr = parseExpr();
        endOfLine();
        return { kind: 'let', name, expr };
      }
      const args = parseCallArgs();
      endOfLine();
      return { kind: 'call', name, args };
    }
    throw new Error(`Each line is:  name = value   or   print something   or   if... / repeat... / recipe... (line ${t.line})`);
  }

  function parseIf() {
    const kw = next(); // 'if'
    const cond = parseExpr();
    expectNewline(kw, 'what happens');
    const thenBlock = parseBlock();
    let elseBlock = [];
    if (isKw(peek(), 'otherwise')) {
      next();
      expectNewline(kw, 'the other option');
      elseBlock = parseBlock();
    }
    expectEnd(kw, 'if');
    return { kind: 'if', cond, thenBlock, elseBlock };
  }

  function parseRepeat() {
    const kw = next(); // 'repeat'
    const count = parseExpr();
    if (!isKw(peek(), 'times')) {
      throw new Error(`Write it like:  repeat 5 times  (line ${kw.line})`);
    }
    next();
    expectNewline(kw, 'what to repeat');
    const body = parseBlock();
    expectEnd(kw, 'repeat');
    return { kind: 'repeat', count, body };
  }

  function parseRecipe() {
    const kw = next(); // 'recipe'
    const nameTok = peek();
    if (nameTok.type !== 'ident') {
      throw new Error(`Give your recipe a name — like:  recipe greet  (line ${kw.line})`);
    }
    const name = next().value;
    const params = [];
    while (peek().type === 'ident') params.push(next().value);
    const bad = peek();
    if (bad.type !== 'newline' && bad.type !== 'eof') {
      throw new Error(`Recipe ingredients must be plain names — like:  recipe add a b  (line ${kw.line})`);
    }
    expectNewline(kw, 'the recipe steps');
    const body = parseBlock();
    expectEnd(kw, 'recipe');
    return { kind: 'recipe', name, params, body };
  }

  // An argument starts with a value. '-' is allowed here (add -5 3),
  // because at statement level a '-' after a name can't be subtraction.
  function parseCallArgs() {
    const args = [];
    for (;;) {
      const t = peek();
      const startsArg = t.type === 'number' || t.type === 'string' || t.type === 'ident' ||
        (t.type === 'op' && (t.value === '(' || t.value === '-' || t.value === '['));
      if (!startsArg) break;
      args.push(parseAdditive());
    }
    return args;
  }

  function parseExpr() { return parseComparison(); }

  function parseComparison() {
    let node = parseAdditive();
    for (;;) {
      const t = peek(), u = peek2();
      let op = null, words = 0;
      if (isKw(t, 'bigger') && isKw(u, 'than')) { op = 'bigger than'; words = 2; }
      else if (isKw(t, 'smaller') && isKw(u, 'than')) { op = 'smaller than'; words = 2; }
      else if (isKw(t, 'equals')) { op = 'equals'; words = 1; }
      else if (isKw(t, 'not') && isKw(u, 'equals')) { op = 'not equals'; words = 2; }
      else break;
      for (let k = 0; k < words; k++) next();
      node = { kind: 'binop', op, left: node, right: parseAdditive() };
    }
    return node;
  }

  function parseAdditive() {
    let node = parseTerm();
    while (peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = next().value;
      node = { kind: 'binop', op, left: node, right: parseTerm() };
    }
    return node;
  }

  function parseTerm() {
    let node = parseFactor();
    while (peek().type === 'op' && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
      const op = next().value;
      node = { kind: 'binop', op, left: node, right: parseFactor() };
    }
    return node;
  }

  function parseFactor() {
    if (peek().type === 'op' && peek().value === '-') {
      next();
      return { kind: 'neg', expr: parseFactor() };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = next();
    let node;
    if (t.type === 'number' || t.type === 'string') {
      node = { kind: 'lit', value: t.value };
    } else if (t.type === 'ident') {
      // A name followed by a value starts a call:  add 2 3
      // (but '-' doesn't — that's subtraction:  x - 5;
      //  and '[' doesn't — that's looking inside:  fruits[0])
      const u = peek();
      const startsArg = u.type === 'number' || u.type === 'string' || u.type === 'ident' ||
        (u.type === 'op' && u.value === '(');
      if (startsArg) {
        node = { kind: 'call', name: t.value, args: parseCallArgs() };
      } else {
        node = { kind: 'var', name: t.value };
      }
    } else if (isOp(t, '(')) {
      node = parseExpr();
      const closing = peek();
      if (!isOp(closing, ')')) throw new Error(`Missing closing bracket ')' (line ${t.line})`);
      next();
    } else if (isOp(t, '[')) {
      node = parseListLiteral(t);
    } else {
      throw new Error(`I expected a number, "word" or (bracket) here (line ${t.line})`);
    }
    // looking inside:  fruits[0]
    while (isOp(peek(), '[')) {
      next();
      const idx = parseExpr();
      if (!isOp(peek(), ']')) throw new Error(`Missing ']' after the position (line ${t.line})`);
      next();
      node = { kind: 'index', list: node, index: idx };
    }
    return node;
  }

  function parseListLiteral(t) {
    const items = [];
    if (isOp(peek(), ']')) { next(); return { kind: 'list', items }; }
    for (;;) {
      items.push(parseExpr());
      const c = peek();
      if (isOp(c, ',')) { next(); continue; }
      if (isOp(c, ']')) { next(); break; }
      throw new Error(`Lists need commas between items and ']' at the end (line ${t.line})`);
    }
    return { kind: 'list', items };
  }

  return parseProgram();
}

// ---------------- Interpreter ----------------
function deepEqual(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  return a === b;
}

function run(program) {
  const env = new Map();      // variables
  const recipes = new Map();  // name -> { params, body }
  let callDepth = 0;

  function evalNode(node) {
    switch (node.kind) {
      case 'lit': return node.value;
      case 'list': return node.items.map(evalNode);
      case 'var':
        if (recipes.has(node.name)) {
          throw new Error(`'${node.name}' is a recipe — use it like:  ${node.name} ...`);
        }
        if (!env.has(node.name)) {
          throw new Error(`I don't know '${node.name}' yet — store it first like: ${node.name} = 5`);
        }
        return env.get(node.name);
      case 'index': {
        const l = evalNode(node.list), k = evalNode(node.index);
        if (!Array.isArray(l)) throw new Error('You can only look inside a list like this:  fruits[0]');
        if (typeof k !== 'number' || !Number.isInteger(k)) {
          throw new Error('List positions are whole numbers, starting at 0');
        }
        if (k < 0 || k >= l.length) {
          throw new Error(`That list has ${l.length} item(s) — positions 0 to ${l.length - 1}`);
        }
        return l[k];
      }
      case 'neg': {
        const v = evalNode(node.expr);
        if (typeof v !== 'number') throw new Error('Can only put minus before a number');
        return -v;
      }
      case 'call': {
        const r = recipes.get(node.name);
        if (!r) {
          if (env.has(node.name)) {
            throw new Error(`'${node.name}' holds a value, it's not a recipe — to show it:  print ${node.name}`);
          }
          throw new Error(`I don't know '${node.name}' — first make it:\n  recipe ${node.name} ...\n  end`);
        }
        if (node.args.length !== r.params.length) {
          throw new Error(`'${node.name}' needs ${r.params.length} ingredient(s) — you gave ${node.args.length}`);
        }
        if (callDepth > 200) {
          throw new Error(`'${node.name}' keeps calling itself forever — check your 'if' stopping rule`);
        }
        const argVals = node.args.map(evalNode);
        const saved = new Map();
        for (let k = 0; k < r.params.length; k++) {
          const p = r.params[k];
          if (env.has(p)) saved.set(p, env.get(p));
          env.set(p, argVals[k]);
        }
        callDepth++;
        let result = null;
        try {
          const out = runBlock(r.body);
          if (out.returned) result = out.value;
        } finally {
          callDepth--;
          for (const p of r.params) {
            if (saved.has(p)) env.set(p, saved.get(p));
            else env.delete(p);
          }
        }
        return result;
      }
      case 'binop': {
        const l = evalNode(node.left), r = evalNode(node.right);
        if (node.op === '+' && (typeof l === 'string' || typeof r === 'string')) {
          return String(l) + String(r);
        }
        if (node.op === '+' && Array.isArray(l) && Array.isArray(r)) {
          return [...l, ...r];
        }
        if (node.op === 'equals') return deepEqual(l, r);
        if (node.op === 'not equals') return !deepEqual(l, r);
        if (node.op === 'bigger than' || node.op === 'smaller than') {
          if (typeof l !== 'number' || typeof r !== 'number') {
            throw new Error(`'${node.op}' compares numbers — try:  if age bigger than 18`);
          }
          return node.op === 'bigger than' ? l > r : l < r;
        }
        if (typeof l !== 'number' || typeof r !== 'number') {
          throw new Error(`'${node.op}' works on numbers (or join words with +)`);
        }
        switch (node.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/':
            if (r === 0) throw new Error("Can't divide by zero");
            return l / r;
          case '%': return l % r;
        }
        throw new Error(`Unknown operator '${node.op}'`);
      }
      default: throw new Error(`Unknown node '${node.kind}'`);
    }
  }

  function stringify(v) {
    if (Array.isArray(v)) return '[' + v.map(stringify).join(', ') + ']';
    if (typeof v === 'number') return String(parseFloat(v.toPrecision(12)));
    if (v === null || v === undefined) return 'nothing';
    return String(v);
  }

  function runBlock(stmts) {
    for (const s of stmts) {
      const r = runStatement(s);
      if (r && r.returned) return r;
    }
    return { returned: false, value: null };
  }

  function runStatement(s) {
    if (s.kind === 'let') { env.set(s.name, evalNode(s.expr)); return; }
    if (s.kind === 'print') { console.log(stringify(evalNode(s.expr))); return; }
    if (s.kind === 'recipe') { recipes.set(s.name, s); return; }
    if (s.kind === 'giveback') { return { returned: true, value: evalNode(s.expr) }; }
    if (s.kind === 'call') { evalNode(s); return; }
    if (s.kind === 'if') {
      const c = evalNode(s.cond);
      if (typeof c !== 'boolean') {
        throw new Error("'if' needs a comparison — like:  if age bigger than 18");
      }
      const out = runBlock(c ? s.thenBlock : s.elseBlock);
      if (out.returned) return out;
      return;
    }
    if (s.kind === 'repeat') {
      const n = evalNode(s.count);
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
        throw new Error("'repeat' needs a whole number — like:  repeat 3 times");
      }
      for (let k = 0; k < n; k++) {
        const out = runBlock(s.body);
        if (out.returned) return out;
      }
      return;
    }
    throw new Error(`Unknown statement '${s.kind}'`);
  }

  const out = runBlock(program.stmts);
  if (out.returned) throw new Error("'give back' only works inside a recipe");
}

// ---------------- Main ----------------
function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node minilang.js <file.ml>');
    console.error('MiniLang is simple:  x = 10   and   print "hi"   — one per line.');
    process.exit(1);
  }
  try {
    const src = fs.readFileSync(file, 'utf8');
    run(parse(tokenize(src)));
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
