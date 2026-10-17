# MiniLang loops
print "Counting down:"
n = 5
repeat n times
  print n
  n = n - 1
end
print "Done!"

print "Three hellos:"
repeat 3 times
  print "hello"
end

# loops inside decisions
x = 4
if x bigger than 2
  repeat 2 times
    print "big x!"
  end
end
