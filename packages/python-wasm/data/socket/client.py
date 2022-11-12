"""

Run the server first, then run this via

    python-wasm client.py

You can also run either the client or server with python-native
to narrow down problems.

"""

import socket

def f():
    conn = socket.create_connection(("localhost", 2000))
    print("connected to port 2000")

    print("*" * 80)
    print("conn =", conn)
    print("*" * 80)

    print(conn.recv(6))
    print(conn.send(b"CoWasm"))

    conn.shutdown(socket.SHUT_RD)

f()