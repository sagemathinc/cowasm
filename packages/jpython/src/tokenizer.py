# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>
from __python__ import hash_literals

from unicode_aliases import ALIAS_MAP
from utils import make_predicate, characters
from ast import AST_Token
from errors import SyntaxError
from string_interpolation import interpolate

RE_HEX_NUMBER = /^0x[0-9a-f]+$/i
RE_OCT_NUMBER = /^0[0-7]+$/
RE_DEC_NUMBER = /^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i

OPERATOR_CHARS = make_predicate(characters("+-*&%=<>!?|~^@"))

ASCII_CONTROL_CHARS = {'a':7, 'b':8, 'f': 12, 'n': 10, 'r': 13, 't': 9, 'v': 11}
HEX_PAT = /[a-fA-F0-9]/
NAME_PAT = /[a-zA-Z ]/

OPERATORS = make_predicate([
    "in",
    "instanceof",
    "typeof",
    "new",
    "void",
    "del",
    "+",
    "-",
    "not",
    "~",
    "&",
    "|",
    "^",
    "**",
    "*",
    "//",
    "/",
    "%",
    ">>",
    "<<",
    ">>>",
    "<",
    ">",
    "<=",
    ">=",
    "==",
    "is",
    "!=",
    "=",
    "+=",
    "-=",
    "//=",
    "/=",
    "*=",
    "%=",
    ">>=",
    "<<=",
    ">>>=",
    "|=",
    "^=",
    "&=",
    "and",
    "or",
    "@",
    "->"
])

OP_MAP = {
    'or': "||",
    'and': "&&",
    'not': "!",
    'del': "delete",
    'None': "null",
    'is': "===",
}

WHITESPACE_CHARS = make_predicate(characters(" \u00a0\n\r\t\f\u000b\u200b\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000"))

PUNC_BEFORE_EXPRESSION = make_predicate(characters("[{(,.;:"))

PUNC_CHARS = make_predicate(characters("[]{}(),;:?"))

KEYWORDS = "as assert break class continue def del do elif else except finally for from global if import in is new nonlocal pass raise return yield try while with or and not"

KEYWORDS_ATOM = "False None True"

# see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar
RESERVED_WORDS = ("break case class catch const continue debugger default delete do else export extends"
" finally for function if import in instanceof new return super switch this throw try typeof var void"
" while with yield enum implements static private package let public protected interface await null true false" )

KEYWORDS_BEFORE_EXPRESSION = "return yield new del raise elif else if"

ALL_KEYWORDS = KEYWORDS + " " + KEYWORDS_ATOM

KEYWORDS = make_predicate(KEYWORDS)
RESERVED_WORDS = make_predicate(RESERVED_WORDS)
KEYWORDS_BEFORE_EXPRESSION = make_predicate(KEYWORDS_BEFORE_EXPRESSION)
KEYWORDS_ATOM = make_predicate(KEYWORDS_ATOM)
IDENTIFIER_PAT = /^[a-z_$][_a-z0-9$]*$/i

def is_string_modifier(val):
    for ch in val:
        if 'vrufVRUF'.indexOf(ch) is -1:
            return False
    return True

def is_letter(code):
    return code >= 97 and code <= 122 or code >= 65 and code <= 90 or code >= 170 and UNICODE.letter.test(String.fromCharCode(code))

def is_digit(code):
    return code >= 48 and code <= 57

def is_alphanumeric_char(code):
    return is_digit(code) or is_letter(code)

def is_unicode_combining_mark(ch):
    return UNICODE.non_spacing_mark.test(ch) or UNICODE.space_combining_mark.test(ch)

def is_unicode_connector_punctuation(ch):
    return UNICODE.connector_punctuation.test(ch)

def is_identifier(name):
    return not RESERVED_WORDS[name] and not KEYWORDS[name] and not KEYWORDS_ATOM[name] and IDENTIFIER_PAT.test(name)

def is_identifier_start(code):
    return code is 36 or code is 95 or is_letter(code)

def is_identifier_char(ch):
    code = ch.charCodeAt(0)
    return is_identifier_start(code) or is_digit(code) or code is 8204 or code is 8205 or is_unicode_combining_mark(ch) or is_unicode_connector_punctuation(ch)

def parse_js_number(num):
    if RE_HEX_NUMBER.test(num):
        return parseInt(num.substr(2), 16)
    elif RE_OCT_NUMBER.test(num):
        return parseInt(num.substr(1), 8)
    elif RE_DEC_NUMBER.test(num):
        return parseFloat(num)

# regexps adapted from http://xregexp.com/plugins/#unicode
UNICODE = {  # {{{
    'letter': RegExp("[\\u0041-\\u005A\\u0061-\\u007A\\u00AA\\u00B5\\u00BA\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u0523\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0621-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971\\u0972\\u097B-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D28\\u0D2A-\\u0D39\\u0D3D\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC\\u0EDD\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8B\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10D0-\\u10FA\\u10FC\\u1100-\\u1159\\u115F-\\u11A2\\u11A8-\\u11F9\\u1200-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u1676\\u1681-\\u169A\\u16A0-\\u16EA\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19A9\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u2094\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2C6F\\u2C71-\\u2C7D\\u2C80-\\u2CE4\\u2D00-\\u2D25\\u2D30-\\u2D65\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u303B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31B7\\u31F0-\\u31FF\\u3400\\u4DB5\\u4E00\\u9FC3\\uA000-\\uA48C\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA65F\\uA662-\\uA66E\\uA67F-\\uA697\\uA717-\\uA71F\\uA722-\\uA788\\uA78B\\uA78C\\uA7FB-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA90A-\\uA925\\uA930-\\uA946\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAC00\\uD7A3\\uF900-\\uFA2D\\uFA30-\\uFA6A\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]"),
    'non_spacing_mark': RegExp("[\\u0300-\\u036F\\u0483-\\u0487\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u0610-\\u061A\\u064B-\\u065E\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED\\u0711\\u0730-\\u074A\\u07A6-\\u07B0\\u07EB-\\u07F3\\u0816-\\u0819\\u081B-\\u0823\\u0825-\\u0827\\u0829-\\u082D\\u0900-\\u0902\\u093C\\u0941-\\u0948\\u094D\\u0951-\\u0955\\u0962\\u0963\\u0981\\u09BC\\u09C1-\\u09C4\\u09CD\\u09E2\\u09E3\\u0A01\\u0A02\\u0A3C\\u0A41\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A70\\u0A71\\u0A75\\u0A81\\u0A82\\u0ABC\\u0AC1-\\u0AC5\\u0AC7\\u0AC8\\u0ACD\\u0AE2\\u0AE3\\u0B01\\u0B3C\\u0B3F\\u0B41-\\u0B44\\u0B4D\\u0B56\\u0B62\\u0B63\\u0B82\\u0BC0\\u0BCD\\u0C3E-\\u0C40\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C62\\u0C63\\u0CBC\\u0CBF\\u0CC6\\u0CCC\\u0CCD\\u0CE2\\u0CE3\\u0D41-\\u0D44\\u0D4D\\u0D62\\u0D63\\u0DCA\\u0DD2-\\u0DD4\\u0DD6\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E\\u0EB1\\u0EB4-\\u0EB9\\u0EBB\\u0EBC\\u0EC8-\\u0ECD\\u0F18\\u0F19\\u0F35\\u0F37\\u0F39\\u0F71-\\u0F7E\\u0F80-\\u0F84\\u0F86\\u0F87\\u0F90-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u102D-\\u1030\\u1032-\\u1037\\u1039\\u103A\\u103D\\u103E\\u1058\\u1059\\u105E-\\u1060\\u1071-\\u1074\\u1082\\u1085\\u1086\\u108D\\u109D\\u135F\\u1712-\\u1714\\u1732-\\u1734\\u1752\\u1753\\u1772\\u1773\\u17B7-\\u17BD\\u17C6\\u17C9-\\u17D3\\u17DD\\u180B-\\u180D\\u18A9\\u1920-\\u1922\\u1927\\u1928\\u1932\\u1939-\\u193B\\u1A17\\u1A18\\u1A56\\u1A58-\\u1A5E\\u1A60\\u1A62\\u1A65-\\u1A6C\\u1A73-\\u1A7C\\u1A7F\\u1B00-\\u1B03\\u1B34\\u1B36-\\u1B3A\\u1B3C\\u1B42\\u1B6B-\\u1B73\\u1B80\\u1B81\\u1BA2-\\u1BA5\\u1BA8\\u1BA9\\u1C2C-\\u1C33\\u1C36\\u1C37\\u1CD0-\\u1CD2\\u1CD4-\\u1CE0\\u1CE2-\\u1CE8\\u1CED\\u1DC0-\\u1DE6\\u1DFD-\\u1DFF\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2CEF-\\u2CF1\\u2DE0-\\u2DFF\\u302A-\\u302F\\u3099\\u309A\\uA66F\\uA67C\\uA67D\\uA6F0\\uA6F1\\uA802\\uA806\\uA80B\\uA825\\uA826\\uA8C4\\uA8E0-\\uA8F1\\uA926-\\uA92D\\uA947-\\uA951\\uA980-\\uA982\\uA9B3\\uA9B6-\\uA9B9\\uA9BC\\uAA29-\\uAA2E\\uAA31\\uAA32\\uAA35\\uAA36\\uAA43\\uAA4C\\uAAB0\\uAAB2-\\uAAB4\\uAAB7\\uAAB8\\uAABE\\uAABF\\uAAC1\\uABE5\\uABE8\\uABED\\uFB1E\\uFE00-\\uFE0F\\uFE20-\\uFE26]"),
    'space_combining_mark': RegExp("[\\u0903\\u093E-\\u0940\\u0949-\\u094C\\u094E\\u0982\\u0983\\u09BE-\\u09C0\\u09C7\\u09C8\\u09CB\\u09CC\\u09D7\\u0A03\\u0A3E-\\u0A40\\u0A83\\u0ABE-\\u0AC0\\u0AC9\\u0ACB\\u0ACC\\u0B02\\u0B03\\u0B3E\\u0B40\\u0B47\\u0B48\\u0B4B\\u0B4C\\u0B57\\u0BBE\\u0BBF\\u0BC1\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCC\\u0BD7\\u0C01-\\u0C03\\u0C41-\\u0C44\\u0C82\\u0C83\\u0CBE\\u0CC0-\\u0CC4\\u0CC7\\u0CC8\\u0CCA\\u0CCB\\u0CD5\\u0CD6\\u0D02\\u0D03\\u0D3E-\\u0D40\\u0D46-\\u0D48\\u0D4A-\\u0D4C\\u0D57\\u0D82\\u0D83\\u0DCF-\\u0DD1\\u0DD8-\\u0DDF\\u0DF2\\u0DF3\\u0F3E\\u0F3F\\u0F7F\\u102B\\u102C\\u1031\\u1038\\u103B\\u103C\\u1056\\u1057\\u1062-\\u1064\\u1067-\\u106D\\u1083\\u1084\\u1087-\\u108C\\u108F\\u109A-\\u109C\\u17B6\\u17BE-\\u17C5\\u17C7\\u17C8\\u1923-\\u1926\\u1929-\\u192B\\u1930\\u1931\\u1933-\\u1938\\u19B0-\\u19C0\\u19C8\\u19C9\\u1A19-\\u1A1B\\u1A55\\u1A57\\u1A61\\u1A63\\u1A64\\u1A6D-\\u1A72\\u1B04\\u1B35\\u1B3B\\u1B3D-\\u1B41\\u1B43\\u1B44\\u1B82\\u1BA1\\u1BA6\\u1BA7\\u1BAA\\u1C24-\\u1C2B\\u1C34\\u1C35\\u1CE1\\u1CF2\\uA823\\uA824\\uA827\\uA880\\uA881\\uA8B4-\\uA8C3\\uA952\\uA953\\uA983\\uA9B4\\uA9B5\\uA9BA\\uA9BB\\uA9BD-\\uA9C0\\uAA2F\\uAA30\\uAA33\\uAA34\\uAA4D\\uAA7B\\uABE3\\uABE4\\uABE6\\uABE7\\uABE9\\uABEA\\uABEC]"),
    'connector_punctuation': RegExp("[\\u005F\\u203F\\u2040\\u2054\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFF3F]")
}  # }}}


def is_token(token, type, val):
    return token.type is type and (val is None or val is undefined or token.value is val)

EX_EOF = {}

def tokenizer(raw_text, filename):
    S = {
        'text': raw_text.replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/\uFEFF/g, ""),
        'filename': filename,
        'pos': 0,
        'tokpos': 0,
        'line': 1,
        'tokline': 0,
        'col': 0,
        'tokcol': 0,
        'newline_before': False,
        'regex_allowed': False,
        'comments_before': v'[]',
        'whitespace_before': v'[]',
        'newblock': False,
        'endblock': False,
        'indentation_matters': v'[ true ]',
        'cached_whitespace': "",
        'prev': undefined,
        'index_or_slice': v'[ false ]',
        'expecting_object_literal_key': False,  # This is set by the parser when it is expecting an object literal key
    }
    def peek():
        return S.text.charAt(S.pos)

    def prevChar():
        return S.text.charAt(S.tokpos - 1)

    def next(signal_eof, in_string):
        ch = S.text.charAt(S.pos)
        S.pos += 1
        if signal_eof and not ch:
            raise EX_EOF

        if ch is "\n":
            S.newline_before = S.newline_before or not in_string
            S.line += 1
            S.col = 0
        else:
            S.col += 1
        return ch

    def find(what, signal_eof):
        pos = S.text.indexOf(what, S.pos)
        if signal_eof and pos is -1:
            raise EX_EOF
        return pos

    def start_token():
        S.tokline = S.line
        S.tokcol = S.col
        S.tokpos = S.pos

    def token(type, value, is_comment, keep_newline):
        S.regex_allowed = (type is "operator"
            or type is "keyword" and KEYWORDS_BEFORE_EXPRESSION[value]
            or type is "punc" and PUNC_BEFORE_EXPRESSION[value])

        if type is "operator" and value is "is" and S.text.substr(S.pos).trimLeft().substr(0, 4).trimRight() is "not":
            next_token()
            value = "!=="

        if type is "operator" and OP_MAP[value]:
            value = OP_MAP[value]

        ret = {
            'type': type,
            'value': value,
            'line': S.tokline,
            'col': S.tokcol,
            'pos': S.tokpos,
            'endpos': S.pos,
            'nlb': S.newline_before,
            'file': filename,
            'leading_whitespace': S.whitespace_before[-1] or '',
        }
        if not is_comment:
            ret.comments_before = S.comments_before
            S.comments_before = v'[]'  # Use a plain JS array for speed
            # make note of any newlines in the comments that came before
            for i in range(ret.comments_before.length):
                ret.nlb = ret.nlb or ret.comments_before[i].nlb

        if not keep_newline:
            S.newline_before = False

        if type is "punc":
            #            if (value is ":" && peek() is "\n") {
            if value is ":" and not S.index_or_slice[-1]
            and not S.expecting_object_literal_key
            and (not S.text.substring(S.pos + 1, find("\n")).trim() or not S.text.substring(S.pos + 1, find("#")).trim()):
                S.newblock = True
                S.indentation_matters.push(True)

            if value is "[":
                if S.prev and (
                    S.prev.type is "name" or
                    (S.prev.type is 'punc' and ')]'.indexOf(S.prev.value) is not -1)
                ):
                    S.index_or_slice.push(True)
                else:
                    S.index_or_slice.push(False)
                S.indentation_matters.push(False)
            elif value is "{" or value is "(":
                S.indentation_matters.push(False)
            elif value is "]":
                S.index_or_slice.pop()
                S.indentation_matters.pop()
            elif value is "}" or value is ")":
                S.indentation_matters.pop()
        S.prev = AST_Token(ret)
        return S.prev

    # this will transform leading whitespace to block tokens unless
    # part of array/hash, and skip non-leading whitespace
    def parse_whitespace():
        leading_whitespace = ""
        whitespace_exists = False
        while WHITESPACE_CHARS[peek()]:
            whitespace_exists = True
            ch = next()
            if ch is "\n":
                leading_whitespace = ""
            else:
                leading_whitespace += ch
        if peek() is not "#":
            if not whitespace_exists:
                leading_whitespace = S.cached_whitespace
            else:
                S.cached_whitespace = leading_whitespace
            if S.newline_before or S.endblock:
                return test_indent_token(leading_whitespace)

    def test_indent_token(leading_whitespace):
        most_recent = S.whitespace_before[-1] or ""
        S.endblock = False
        if S.indentation_matters[-1] and leading_whitespace is not most_recent:
            if S.newblock and leading_whitespace and leading_whitespace.indexOf(most_recent) is 0:
                # positive indent, new block
                S.newblock = False
                S.whitespace_before.push(leading_whitespace)
                return 1
            elif most_recent and most_recent.indexOf(leading_whitespace) is 0:
                # negative indent, block is ending
                S.endblock = True
                S.whitespace_before.pop()
                return -1
            else:
                # indent mismatch, inconsistent indentation
                parse_error("Inconsistent indentation")
        return 0

    def read_while(pred):
        ret = ""
        i = 0
        ch = ''
        while (ch = peek()) and pred(ch, i):
            i += 1
            ret += next()
        return ret

    def parse_error(err, is_eof):
        raise new SyntaxError(err, filename, S.tokline, S.tokcol, S.tokpos, is_eof)

    def read_num(prefix):
        has_e = False
        has_x = False
        has_dot = prefix is "."
        if not prefix and peek() is '0' and S.text.charAt(S.pos + 1) is 'b':
            next(), next()
            num = read_while(def(ch): return ch is '0' or ch is '1';)
            valid = parseInt(num, 2)
            if isNaN(valid):
                parse_error('Invalid syntax for a binary number')
            return token('num', valid)
        seen = v'[]'
        num = read_while(def(ch, i):
            nonlocal has_dot, has_e, has_x
            seen.push(ch)
            if ch is 'x' or ch is 'X':
                if has_x or seen.length is not 2 or seen[0] is not '0':
                    return False
                has_x = True
                return True
            elif ch is 'e' or ch is 'E':
                if has_x:
                    return True
                if has_e or i == 0:
                    return False
                has_e = True
                return True
            elif ch is '-':
                if i is 0 and not prefix:
                    return True
                if has_e and seen[i-1].toLowerCase() is 'e':
                    return True
                return False
            elif ch is '+':
                if has_e and seen[i-1].toLowerCase() is 'e':
                    return True
                return False
            elif ch is '.':
                return (has_dot = True) if not has_dot and not has_x and not has_e else False
            return is_alphanumeric_char(ch.charCodeAt(0))
        )
        if prefix:
            num = prefix + num

        valid = parse_js_number(num)
        if not isNaN(valid):
            return token("num", valid)
        else:
            parse_error("Invalid syntax: " + num)

    def read_hex_digits(count):
        ans = ''
        while count > 0:
            count -= 1
            if not HEX_PAT.test(peek()):
                return ans
            ans += next()
        nval = parseInt(ans, 16)
        if nval > 0x10FFFF:
            return ans
        return nval

    def read_escape_sequence():
        q = next(True)
        if q is '\n':
            return ''
        if q is '\\':
            return q
        if '"\''.indexOf(q) is not -1:
            return q
        if ASCII_CONTROL_CHARS[q]:
            return String.fromCharCode(ASCII_CONTROL_CHARS[q])
        if '0' <= q <= '7':
            octal = q
            if '0' <= peek() <= '7':
                octal += next()
            if '0' <= peek() <= '7':
                octal += next()
            code = parseInt(octal, 8)
            if isNaN(code):
                return '\\' + octal
            return String.fromCharCode(code)
        if q is 'x':
            code = read_hex_digits(2)
            if jstype(code) is 'number':
                return String.fromCharCode(code)
            return '\\x' + code
        if q is 'u':
            code = read_hex_digits(4)
            if jstype(code) is 'number':
                return String.fromCharCode(code)
            return '\\u' + code
        if q is 'U':
            code = read_hex_digits(8)
            if jstype(code) is 'number':
                if code <= 0xFFFF:
                    return String.fromCharCode(code)
                code -= 0x10000
                return String.fromCharCode(0xD800+(code>>10), 0xDC00+(code&0x3FF))
            return '\\U' + code
        if q is 'N' and peek() is '{':
            next()
            name = read_while(def (ch): return NAME_PAT.test(ch);)
            if peek() is not '}':
                return '\\N{' + name
            next()
            key = (name or '').toLowerCase()
            if not name or not Object.prototype.hasOwnProperty.call(ALIAS_MAP, key):
                return '\\N{' + name + '}'
            code = ALIAS_MAP[key]
            if code <= 0xFFFF:
                return String.fromCharCode(code)
            code -= 0x10000
            return String.fromCharCode(0xD800+(code>>10), 0xDC00+(code&0x3FF))
        return '\\' + q

    def with_eof_error(eof_error, cont):
        return def():
            try:
                return cont.apply(None, arguments)
            except as ex:
                if ex is EX_EOF:
                    parse_error(eof_error, True)
                else:
                    raise

    read_string = with_eof_error("Unterminated string constant", def(is_raw_literal, is_js_literal):
        quote = next()
        tok_type = 'js' if is_js_literal else 'string'
        ret = ""
        is_multiline = False
        if peek() is quote:
            # two quotes in a row
            next(True)
            if peek() is quote:
                # multiline string (3 quotes in a row)
                next(True)
                is_multiline = True
            else:
                return token(tok_type, '')

        while True:
            ch = next(True, True)
            if not ch:
                break
            if ch is "\n" and not is_multiline:
                parse_error("End of line while scanning string literal")

            if ch is "\\":
                ret += ('\\' + next(True)) if is_raw_literal else read_escape_sequence()
                continue

            if ch is quote:
                if not is_multiline:
                    break
                if peek() is quote:
                    next()
                    if peek() is quote:
                        next()
                        break
                    else:
                        ch += quote
            ret += ch
        return token(tok_type, ret)
    )

    def handle_interpolated_string(string, start_tok):
        def raise_error(err):
            raise new SyntaxError(err, filename, start_tok.line, start_tok.col, start_tok.pos, False)
        S.text = S.text[:S.pos] + '(' + interpolate(string, raise_error) + ')' + S.text[S.pos:]
        return token('punc', next())

    def read_line_comment(shebang):
        if not shebang:
            next()
        i = find("\n")

        if i is -1:
            ret = S.text.substr(S.pos)
            S.pos = S.text.length
        else:
            ret = S.text.substring(S.pos, i)
            S.pos = i

        return token("shebang" if shebang else "comment1", ret, True)

    def read_name():
        name = ch = ""
        while (ch = peek()) is not None:
            if ch is "\\":
                if S.text.charAt(S.pos + 1) is "\n":
                    S.pos += 2
                    continue
                break
            elif is_identifier_char(ch):
                name += next()
            else:
                break
        return name

    read_regexp = with_eof_error("Unterminated regular expression", def():
        prev_backslash = False
        regexp = ch = ''
        in_class = False
        verbose_regexp = False
        in_comment = False

        if peek() is '/':
            next(True)
            if peek() is '/':
                verbose_regexp  = True
                next(True)
            else: # empty regexp (//)
                mods = read_name()
                return token("regexp", RegExp(regexp, mods))
        while True:
            ch = next(True)
            if not ch:
                break
            if in_comment:
                if ch is '\n':
                    in_comment = False
                continue
            if prev_backslash:
                regexp += "\\" + ch
                prev_backslash = False
            elif ch is "[":
                in_class = True
                regexp += ch
            elif ch is "]" and in_class:
                in_class = False
                regexp += ch
            elif ch is "/" and not in_class:
                if verbose_regexp:
                    if peek() is not '/':
                        regexp += '\\/'
                        continue
                    next(True)
                    if peek() is not '/':
                        regexp += '\\/\\/'
                        continue
                    next(True)
                break
            elif ch is "\\":
                prev_backslash = True
            elif verbose_regexp and not in_class and ' \n\r\t'.indexOf(ch) is not -1:
                pass
            elif verbose_regexp and not in_class and ch is '#':
                in_comment = True
            else:
                regexp += ch

        mods = read_name()
        return token("regexp", RegExp(regexp, mods))
    )

    def read_operator(prefix):
        def grow(op):
            if not peek():
                return op

            bigger = op + peek()
            if OPERATORS[bigger]:
                next()
                return grow(bigger)
            else:
                return op
        op = grow(prefix or next())
        if op is '->':
            # pretend that this is an operator as the tokenizer only allows
            # one character punctuation.
            return token('punc', op)
        return token("operator", op)

    def handle_slash():
        next()
        return read_regexp("") if S.regex_allowed else read_operator("/")

    def handle_dot():
        next()
        return read_num(".") if is_digit(peek().charCodeAt(0)) else token("punc", ".")

    def read_word():
        word = read_name()
        return token("atom", word) if KEYWORDS_ATOM[word] else (token("name", word) if not KEYWORDS[word] else (token("operator", word) if OPERATORS[word] and prevChar() is not "." else token("keyword", word)))

    def next_token():

        indent = parse_whitespace()
        # if indent is 1:
        #     return token("punc", "{")
        if indent is -1:
            return token("punc", "}", False, True)

        start_token()
        ch = peek()
        if not ch:
            return token("eof")

        code = ch.charCodeAt(0)
        tmp_ = code
        if tmp_ is 34 or tmp_ is 39:    # double-quote (") or single quote (')
            return read_string(False)
        elif tmp_ is 35:                # pound-sign (#)
            if S.pos is 0 and S.text.charAt(1) is '!':
                #shebang
                return read_line_comment(True)
            regex_allowed = S.regex_allowed
            S.comments_before.push(read_line_comment())
            S.regex_allowed = regex_allowed
            return next_token()
        elif tmp_ is 46:                # dot (.)
            return handle_dot()
        elif tmp_ is 47:                # slash (/)
            return handle_slash()

        if is_digit(code):
            return read_num()

        if PUNC_CHARS[ch]:
            return token("punc", next())

        if OPERATOR_CHARS[ch]:
            return read_operator()

        if code is 92 and S.text.charAt(S.pos + 1) is "\n":
            # backslash will consume the newline character that follows
            next()
            # backslash
            next()
            # newline
            S.newline_before = False
            return next_token()

        if is_identifier_start(code):
            tok = read_word()
            if '\'"'.indexOf(peek()) is not -1 and is_string_modifier(tok.value):
                mods = tok.value.toLowerCase()
                start_pos_for_string = S.tokpos
                stok = read_string(mods.indexOf('r') is not -1, mods.indexOf('v') is not -1)
                tok.endpos = stok.endpos
                if stok.type is not 'js' and mods.indexOf('f') is not -1:
                    tok.col += start_pos_for_string - tok.pos
                    return handle_interpolated_string(stok.value, tok)
                tok.value = stok.value
                tok.type = stok.type
            return tok

        parse_error("Unexpected character «" + ch + "»")

    next_token.context = def(nc):
        nonlocal S
        if nc:
            S = nc
        return S

    return next_token
