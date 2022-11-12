import socket

# TODO: ipv6 not fully supported yet in posix-node/src/socket.zig for
# address.
#s = socket.create_server(("", 2000), family=socket.AF_INET6)

# TODO: when I try "" then "wildcard resolved to multiple address"
# is hit in socketmodule.c, perhaps due to some option not being
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
    print("Sending ", SEND)
    conn.send(SEND)
    print("Receiving...")
    print(conn.recv(6))
    conn.close()
