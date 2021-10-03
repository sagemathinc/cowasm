# Placeholder for now -- nothing implemented

def exit(status=None):
    if status is None:
        status = 0
    elif not isinstance(status, int):
        print(status)
        status = 1
    process.exit(status)

argv = process.argv