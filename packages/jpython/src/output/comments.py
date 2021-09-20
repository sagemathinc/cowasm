# vim:fileencoding=utf-8
# License: BSD Copyright: 2018, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals

from ast import AST_Exit, is_node_type


def output_comments(comments, output, nlb):
    for comm in comments:
        if comm.type is "comment1":
            output.print("//" + comm.value + "\n")
            output.indent()
        elif comm.type is "comment2":
            output.print("/*" + comm.value + "*/")
            if nlb:
                output.print("\n")
                output.indent()
            else:
                output.space()


def print_comments(self, output):
    c = output.options.comments
    if c:
        start = self.start
        if start and not start._comments_dumped:
            start._comments_dumped = True
            comments = start.comments_before
            # XXX: ugly fix for https://github.com/mishoo/RapydScript2/issues/112
            #      if this node is `return` or `throw`, we cannot allow comments before
            #      the returned or thrown value.
            if is_node_type(self, AST_Exit) and self.value and self.value.start.comments_before and self.value.start.comments_before.length > 0:
                comments = (comments or v'[]').concat(self.value.start.comments_before)
                self.value.start.comments_before = v'[]'

            if c.test:
                comments = comments.filter(def(comment):
                    return c.test(comment.value)
                )
            elif jstype(c) is "function":
                comments = comments.filter(def(comment):
                    return c(self, comment)
                )

            output_comments(comments, output, start.nlb)
