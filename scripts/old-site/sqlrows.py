import gzip

BACKSLASH = chr(92)
ESC = {'n': '\n', 'r': '\r', 't': '\t', '0': '\0'}


def rows(path, table):
    """Yield value lists for INSERT INTO `table` statements in a MySQL dump."""
    pre = f"INSERT INTO `{table}`"
    with gzip.open(path, 'rt', encoding='utf-8', errors='replace') as f:
        buf = None
        for line in f:
            if buf is None:
                if not line.startswith(pre):
                    continue
                buf = line
            else:
                buf += line
            if buf.rstrip().endswith(';'):
                yield from parse_values(buf[buf.index(' VALUES') + 7:])
                buf = None


def parse_values(s):
    i, n = 0, len(s)
    while i < n:
        if s[i] != '(':
            i += 1
            continue
        i += 1
        row, val, inq, quoted = [], '', False, False
        while i < n:
            c = s[i]
            if inq:
                if c == BACKSLASH:
                    nx = s[i + 1]
                    val += ESC.get(nx, nx)
                    i += 2
                    continue
                if c == "'":
                    if s[i + 1:i + 2] == "'":
                        val += "'"
                        i += 2
                        continue
                    inq = False
                    i += 1
                    continue
                val += c
                i += 1
                continue
            if c == "'":
                inq, quoted = True, True
                i += 1
                continue
            if c in ',)':
                v = val.strip()
                row.append(val if quoted else (None if v == 'NULL' else v))
                val, quoted = '', False
                i += 1
                if c == ')':
                    yield row
                    break
                continue
            val += c
            i += 1
