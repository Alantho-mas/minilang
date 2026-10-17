# MiniLang recipes (reusable functions)

recipe greet name
  print "Hello, " + name + "!"
end

greet "Alan"
greet "Priya"

recipe add a b
  give back a + b
end

result = add 2 3
print "2 + 3 = " + result
print "10 + 20 = " + add 10 20

# recipes can call themselves (recursion)
recipe countdown n
  if n smaller than 1
    print "Blast off!"
  otherwise
    print n
    countdown n - 1
  end
end

countdown 3

# recipes calling recipes
recipe double x
  give back x * 2
end

recipe quadruple x
  give back double double x
end

print "double 5 = " + double 5
print "quadruple 5 = " + quadruple 5
