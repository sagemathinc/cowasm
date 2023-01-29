import ssl
ssl._create_default_https_context = ssl._create_unverified_context
import http.client

connection = http.client.HTTPSConnection('pypi.org')
print(connection)

connection.request("GET", "/simple/pip/")
response = connection.getresponse()
print("Status: {} and reason: {}".format(response.status, response.reason))

connection.close()