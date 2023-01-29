import sys, time

sys.path.insert(0, 'dist')
import hellozig, hello

print(hellozig.add389(100))
hellozig.hello('william')
print(hellozig.gcd(18, 21))
t = time.time()
print(sum(hellozig.gcd(12345678, n) for n in range(1,1000000)))
print(time.time() - t)

print("\n---\n")
print(hello.add389(100))
hello.hello('william')
print(hello.gcd(18, 21))
t = time.time()
print(sum(hello.gcd(12345678, n) for n in range(1,1000000)))
print(time.time() - t)
