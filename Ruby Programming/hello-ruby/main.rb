# This a comment

# Ruby is a pure OOP language
# - everything is an object in Ruby
# - very programmer oriented syntax
# - dynamically typed

# puts stands for put string
# - used to print out the argument to the console
puts "Hello, welcome to Ruby programming!" # has a newline
p "Hello, welcome to Ruby programming!"
print "Hello, welcome to Ruby programming!" # does not have a newline

# Defining a function say_hello to print out a message which is passed in as an argument
def say_hello(message)
  puts message
end

say_hello "\nHello, welcome to Ruby programming!"