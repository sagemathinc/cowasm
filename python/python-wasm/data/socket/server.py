"""

Run this via

    python-wasm server.py

NOTE: I haven't implemented checking for signals when blocking on
posix-node yet, so you have to hit control+Z then kill the job,
rather than control+C.

"""

import socket

# TODO: ipv6 is not supported yet in posix-node/src/socket.zig.
# See comments there and use this code to test it:
#s = socket.create_server(("localhost", 2000), family=socket.AF_INET6)

# TODO: when I try "" for the address then "wildcard resolved to multiple address"
# is hit in socketmodule.c, probably due to some option not being
# supported properly in getaddrinfo.
#s = socket.create_server(("", 2000), family=socket.AF_INET)

s = socket.create_server(("localhost", 2000))
s.listen(1)

print("listening on port 2000")

SEND = b"Hello\n"
while True:
    print("Waiting for connection...")
    conn, addr = s.accept()
    print("Accepted connection", conn, addr)
    try:
        import time; time.sleep(0.25)
        print("Sending ", SEND)
        conn.send(SEND)
        print("Receiving...")
        print(conn.recv(6))
        conn.close()
    except Exception as e:
        print(e)
