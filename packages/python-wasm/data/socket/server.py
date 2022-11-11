import socket

#s = socket.create_server(("", 2000), family=socket.AF_INET6)
s = socket.create_server(("", 2000))
s.listen(1)

print("listening on port 2000")

SEND = b"Hello\n"
while True:
    conn, addr = s.accept()
    print(conn, addr)
    print("Sending ", SEND)
    conn.send(SEND)
    print("Receiving...")
    print(conn.recv(6))
    conn.close()
