"""

"""

import socket

def _set_socket_options(sock, options):
    if options is None:
        return

    for opt in options:
        sock.setsockopt(*opt)


def f(address):
    timeout = 5
    socket_options = [(6, 1, 1)]

    host, port = address
    if host.startswith("["):
        host = host.strip("[]")
    err = None

    # Using the value from allowed_gai_family() in the context of getaddrinfo lets
    # us select whether to work with IPv4 DNS records, IPv6 records, or both.
    # The original create_connection function always returns all records.
    family = socket.AF_INET

    host.encode("idna")

    for res in socket.getaddrinfo("pypi.org", 443, family, socket.SOCK_STREAM):
        print("res = ", res)
        af, socktype, proto, canonname, sa = res
        sock = socket.socket(af, socktype, proto)
        _set_socket_options(sock, socket_options)
        sock.settimeout(timeout)
        print("sock.connect(sa) ", sock, sa)
        sock.connect(sa)
        print("connected!", sock)
        return sock


f(['pypy.org', 443])
