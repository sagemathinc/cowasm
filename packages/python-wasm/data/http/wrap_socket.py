import ssl
import socket
#context0 = ssl.SSLContext(16)
#print(context0)

conn = socket.create_connection(("localhost", 2000))

import ssl
# this works with "import ssl" down here, but breaks
# with "import ssl" at the top of this file.
context = ssl.SSLContext(16)
print(context)