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

puts ""

# Strings
# - text enclosed within double quotation marks (or single quotes) "Hello, world!"

sentence = 'My name is Sami'
p sentence

# String concatenation
first_name = 'Sami'
last_name = 'Munir'
puts first_name + " " + last_name

# String interpolation
# - only works within double quoted strings
puts "My first name is #{first_name} and my last name is #{last_name}"
full_name = "#{first_name} #{last_name}"
puts full_name

# Object/String methods
# - method chaining
puts "\nfirst_name.class: #{first_name.class}"
puts "10.class: #{10.class}"
puts "10.to_s.class: #{10.to_s.class}"
puts "full_name.length: #{full_name.length}"
puts "full_name.reverse: #{full_name.reverse}"
puts "full_name.capitalize: #{full_name.capitalize}"
puts "full_name.empty?: #{full_name.empty?}"
puts "full_name.nil?: #{full_name.nil?}"

# sub vs. gsub
# - gsub will do a global substitution
sentence = "Welcome to the jungle"
puts "\nsentence: #{sentence}"
sentence = sentence.sub("the jungle", "the utopia")
puts "sentence: #{sentence}"