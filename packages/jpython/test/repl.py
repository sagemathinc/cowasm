# DISABLED -- because mysteriously the instrumentation of the console, etc., isn't working.

stdout = []

DEBUG = False


def clear():
    stdout.length = 0


class FakeConsole:
    def log(self):
        def f(arg):
            if DEBUG: console.log("stdout: '%s'", arg)
            stdout.push((arg or '').toString())

        Array.prototype.slice.call(arguments).forEach(f)
        stdout.push('\n')

    def error(self):
        def f(arg):
            console.error(arg)  # we also just show these as normal
            stdout.push((arg or '').toString())

        Array.prototype.slice.call(arguments).forEach(f)
        stdout.push('\n')


class FakeReadline:
    def __init__(self):
        self.listeners = {}
        self._prompt = ''

    def setPrompt(self, prompt):
        self._prompt = prompt

    def write(self, data):
        stdout.push(data)

    def clearLine(self):
        pass

    def on(self, event, callback):
        self.listeners[event] = callback
        return self

    def prompt(self):
        stdout.push(self._prompt)

    def send_line(self, text):
        if DEBUG: console.log("send: '%s'", text)
        self.listeners['line'](text)


repl = require('./repl').default
rl = FakeReadline()

send_line = rl.send_line.bind(rl)

eq = assrt.equal


def send_text(text):
    for line in text.split('\n'):
        send_line(line)


def check(text, output):
    send_text(text)
    eq(output, stdout[0])
    clear()


def check_in(text, output):
    send_text(text)
    assrt.ok(output in stdout, output + ' not in ' + stdout)
    clear()


def check_not_in(text, output):
    send_text(text)
    assrt.ok(output not in stdout)
    clear()


def mockReadline(options):
    rl.completer = options.completer
    return rl


repl({
    'console': FakeConsole(),
    'mockReadline': mockReadline,
    'terminal': False,
    'show_js': False,
    'histfile': False,
    'ps1': '>>>'
})


def test_basics():
    print(stdout)
    eq('>>> ', stdout[-1])
    clear()
    check('1', '1')
    check_in('if 1:\n  2\n  \n  ', '2')
    check_in('1 +\n1\n\n', '2')
    check('max(1, 2)', '2')
    send_text('''
    class A:
        def __init__(self, a):
            self.a = a
    ''')
    clear()
    check_in('b = A(1)\nb.a', '1')
    check_in('c = A(2)\nc.a', '2')
    send_text('from __python__ import dict_literals\nd={1:1}')
    check_in('isinstance(d, dict)', 'True')
    send_text('from __python__ import no_dict_literals\nd={1:1}')
    check_in('isinstance(d, dict)', 'False')


test_basics()


def test_completions():
    # Test completions
    def completions(line):
        return rl.completer(line)[0]

    def check_completions():
        items = completions(arguments[0])
        for x in Array.prototype.slice.call(arguments, 1):
            assrt.ok(items and x in items,
                     x + ' not in completions for: ' + arguments[0])

    check_completions('', 'return', 'A')
    check_completions('Array.', 'isArray', 'apply')
    send_text('x = ""\ny = []'), clear()
    check_completions('x.', 'substr', 'trim')
    check_completions('y.', 'concat', 'push')
    check_completions('x.sl', 'slice')
    send_text('y = {"x":1}'), clear()
    check_completions('y.', 'x')

    # Test docstrings
    clear()
    send_text('def ds():\n "xxx"\n\n')
    clear()
    check('ds.__doc__', "xxx")


test_completions()


def test_semicolons():
    check("a=2;b=3;print(a+b)", "5")
    check("2+3", "5")
    check("import math; print(math.sin(1))", "0.8414709848078965")


test_semicolons()
