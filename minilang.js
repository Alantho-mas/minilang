#!/usr/bin/env node
'use strict';
/*
 * MiniLang — a tiny programming language anyone can learn in 5 minutes.
 *
 * Only two things to learn:
 *   1. Store a value:   x = 10
 *   2. Show something:  print "Hello"
 *
 * No 'let', no semicolons, one statement per line. That's the whole language.
 *
 * Usage: node minilang.js <file.ml>
 */

const fs = require('fs');

// ---------------- Tokenizer ----------------
function tokenize(src) {
  const tokens = [];
  let i = 0, line = 1;
  const isDigit = (c) => c >= '0' && c <= '9';
  const isAlpha = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  const at = (msg) => `${msg} (line ${line})`;

  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { tokens.push({ type: 'newline', line }); line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === ';') { i++; continue; } // ; is optional, ignored
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
      tokens.push({ type: word === 'let' || word === 'print' ? 'keyword' : 'ident', value: word, line });
      i = j; continue;
    }

    if ('+-*/%()='.includes(c)) { tokens.push({ type: 'op', value: c, line }); i++; continue; }
    throw new Error(at(`I don't understand '${c}' — MiniLang only uses letters, numbers, "quotes" and + - * / % ( ) =`));
  }
  tokens.push({ type: 'eof', line });
  return tokens;
}

// ---------------- Parser ----------------
// program   := (statement newline*)*
// statement := IDENT "=" expr | "print" expr        (one per line)
// expr      := term (("+" | "-") term)*
// term      := factor (("*" | "/" | "%") factor)*
// factor    := "-" factor | primary
// primary   := NUMBER | STRING | IDENT | "(" expr ")"

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function endOfLine() {
    const n = peek();
    if (n.type === 'newline') { next(); return; }
    if (n.type === 'eof') return;
    throw new Error(`One statement per line, please (line ${n.line})`);
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

  function parseStatement() {
    const t = peek();
    if (t.type === 'keyword' && t.value === 'let') {
      throw new Error(`No 'let' needed in MiniLang (line ${t.line}) — just write:  x = 5`);
    }
    if (t.type === 'keyword' && t.value === 'print') {
      next();
      const expr = parseExpr();
      endOfLine();
      return { kind: 'print', expr };
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
      throw new Error(`Did you mean '${name} = ...'? Every line stores a value or prints one (line ${t.line})`);
    }
    throw new Error(`Each line is either:  name = value   or   print something   (line ${t.line})`);
  }

  function parseExpr() {
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

  for (const s of program.stmts) {
    if (s.kind === 'let') env.set(s.name, evalNode(s.expr));
    else if (s.kind === 'print') console.log(stringify(evalNode(s.expr)));
  }
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
