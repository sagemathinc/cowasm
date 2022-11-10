import socket

#s = socket.create_server(("", 2000), family=socket.AF_INET6)
s = socket.create_server(("", 2000))
s.listen(1)

print("listening on port 2000")

while True:
    conn, addr = s.accept()
    print(conn, addr)
    conn.send(b"Hello\n")
    conn.close()
