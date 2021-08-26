def pi(number):
    primes = list(range(number + 1))

    i = 2
    while i * i <= number:
        if primes[i] != 0:
            for j in range(2, number):
                if primes[i] * j > number:
                    break
                else:
                    primes[primes[i] * j] = 0
        i += 1

    cnt = 0
    for i in range(2, number + 1):
        if primes[i] != 0:
            cnt += 1

    return cnt