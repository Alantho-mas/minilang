#!/usr/bin/env node
'use strict';
/*
 * MiniLang — a tiny programming language anyone can learn in 5 minutes.
 *
 * Stage 1: store values (x = 10), show things (print "hi"), maths.
 * Stage 2: decisions and loops, all in plain words:
 *
 *   if age bigger than 18
 *     print "adult"
 *   otherwise
 *     print "young"
 *   end
 *
 *   repeat 3 times
 *     print "hello"
 *   end
 *
 * Usage: node minilang.js <file.ml>
 */

const fs = require('fs');

// ---------------- Tokenizer ----------------
const KEYWORDS = ['let', 'print', 'if', 'otherwise', 'end', 'repeat', 'times',
                  'bigger', 'smaller', 'than', 'equals', 'not'];

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

    if ('+-*/%()='.includes(c)) { tokens.push({ type: 'op', value: c, line }); i++; continue; }
    throw new Error(at(`I don't understand '${c}' — MiniLang only uses plain words, "quotes" and + - * / % ( ) =`));
  }
  tokens.push({ type: 'eof', line });
  return tokens;
}

// ---------------- Parser ----------------
// program    := (statement newline*)*
// statement  := IDENT "=" expr | "print" expr | ifStmt | repeatStmt
// ifStmt     := "if" expr newline block ("otherwise" newline block)? "end"
// repeatStmt := "repeat" expr "times" newline block "end"
// block      := (statement newline*)*
// expr       := comparison
// comparison := additive ((bigger than | smaller than | equals | not equals) additive)*
// additive   := term (("+" | "-") term)*
// term       := factor (("*" | "/" | "%") factor)*
// factor     := "-" factor | primary
// primary    := NUMBER | STRING | IDENT | "(" expr ")"

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const peek2 = () => tokens[pos + 1];
  const next = () => tokens[pos++];
  const isKw = (t, w) => t.type === 'keyword' && t.value === w;

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
      if (t.type === 'eof') throw new Error("Missing 'end' — every 'if' and 'repeat' needs one at the finish");
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
      throw new Error(`'${t.value}' is a special MiniLang word — use another name (line ${t.line})`);
    }
    if (t.type === 'ident') {
      const name = next().value;
      const eq = peek();
      if (eq.type === 'op' && eq.value === '=') {
        next();
        const expr = parseExpr();
        endOfLine();
        return { kind: 'let', name, expr };
      }
      throw new Error(`Did you mean '${name} = ...'? Every line stores a value, prints one, or starts if/repeat (line ${t.line})`);
    }
    throw new Error(`Each line is:  name = value   or   print something   or   if.../repeat... (line ${t.line})`);
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
    const endTok = peek();
    if (!isKw(endTok, 'end')) {
      throw new Error(`An 'if' needs 'end' at the finish (line ${kw.line})`);
    }
    next();
    endOfLine();
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
    const endTok = peek();
    if (!isKw(endTok, 'end')) {
      throw new Error(`A 'repeat' needs 'end' at the finish (line ${kw.line})`);
    }
    next();
    endOfLine();
    return { kind: 'repeat', count, body };
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
    if (t.type === 'number' || t.type === 'string') return { kind: 'lit', value: t.value };
    if (t.type === 'ident') return { kind: 'var', name: t.value };
    if (t.type === 'op' && t.value === '(') {
      const node = parseExpr();
      const closing = peek();
      if (closing.type !== 'op' || closing.value !== ')') {
        throw new Error(`Missing closing bracket ')' (line ${t.line})`);
      }
      next();
      return node;
    }
    throw new Error(`I expected a number, "word" or (bracket) here (line ${t.line})`);
  }

  return parseProgram();
}

// ---------------- Interpreter ----------------
function run(program) {
  const env = new Map();

  function evalNode(node) {
    switch (node.kind) {
      case 'lit': return node.value;
      case 'var':
        if (!env.has(node.name)) throw new Error(`I don't know '${node.name}' yet — store it first like: ${node.name} = 5`);
        return env.get(node.name);
      case 'neg': {
        const v = evalNode(node.expr);
        if (typeof v !== 'number') throw new Error('Can only put minus before a number');
        return -v;
      }
      case 'binop': {
        const l = evalNode(node.left), r = evalNode(node.right);
        if (node.op === '+' && (typeof l === 'string' || typeof r === 'string')) {
          return String(l) + String(r);
        }
        switch (node.op) {
          case 'equals': return l === r;
          case 'not equals': return l !== r;
          case 'bigger than':
          case 'smaller than':
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
    if (typeof v === 'number') return String(parseFloat(v.toPrecision(12)));
    return String(v);
  }

  function runBlock(stmts) {
    for (const s of stmts) runStatement(s);
  }

  function runStatement(s) {
    if (s.kind === 'let') env.set(s.name, evalNode(s.expr));
    else if (s.kind === 'print') console.log(stringify(evalNode(s.expr)));
    else if (s.kind === 'if') {
      const c = evalNode(s.cond);
      if (typeof c !== 'boolean') {
        throw new Error("'if' needs a comparison — like:  if age bigger than 18");
      }
      runBlock(c ? s.thenBlock : s.elseBlock);
    } else if (s.kind === 'repeat') {
      const n = evalNode(s.count);
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
        throw new Error("'repeat' needs a whole number — like:  repeat 3 times");
      }
      for (let k = 0; k < n; k++) runBlock(s.body);
    }
  }

  runBlock(program.stmts);
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
