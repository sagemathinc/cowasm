
-- sum the integers from 1 up to n
function sum (n)
  local s = 0
  for i = 1,n do
    s = s + i
  end
  return s
end

start = os.clock()
s = sum(10000000)
print(s, os.clock()-start)