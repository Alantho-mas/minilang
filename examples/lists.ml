# MiniLang lists
fruits = ["apple", "banana", "mango"]
print fruits
print "First fruit: " + fruits[0]
print "Last fruit: " + fruits[2]

nums = [10, 20, 30]
print "Second number times 2 = " + nums[1] * 2

# join two lists with +
more = fruits + ["grapes"]
print more

# lists in recipes
recipe total prices
  sum = 0
  i = 0
  repeat 3 times
    sum = sum + prices[i]
    i = i + 1
  end
  give back sum
end

print "Total: " + total([5, 10, 15])
