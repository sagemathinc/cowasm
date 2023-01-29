"""

Run the server first, then run this via

    python-wasm client.py

You can also run either the client or server with python-native
to narrow down problems.

"""

import socket, time


def f():
    # TODO: This currently "hangs for 5 seconds" even
    # though the other side is ready. The problem
    # is that poll_oneoff or pollSocket (in posix-node)
    # need to be improved.
    conn = socket.create_connection(("localhost", 2000), timeout=5)
    print("connected to port 2000")
    #conn.settimeout(1)

    print("*" * 80)
    print("conn =", conn)
    print("*" * 80)

    t = time.time()
    print(conn.recv(6))
    print("time = ", time.time() - t)

    t = time.time()
    print(conn.send(b"CoWasm"))
    print("time = ", time.time() - t)

    #conn.shutdown(socket.SHUT_RD)


f()
