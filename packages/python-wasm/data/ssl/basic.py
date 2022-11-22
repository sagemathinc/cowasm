from _ssl import _SSLContext
import sys
import hashlib,  ssl

def main():
    print(sys.platform)
    c = _SSLContext(16)
    print(c)
    return c

if __name__ == '__main__':
    [main() for i in range(10)]

