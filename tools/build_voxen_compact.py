"""Build Voxen's deterministic, source-preserving deployment artifact.

The canonical contract remains the readable source of truth. This builder only
rewrites tokens: it drops comments/docstrings and unneeded whitespace, and
mangles names which cannot be part of Voxen's public ABI or JSON output.
"""
from __future__ import annotations
import argparse
import ast
import io
import itertools
import keyword
import string
import tokenize
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "contracts" / "voxen.py"
ARTIFACT = ROOT / "artifacts" / "voxen.compact.py"


class _RemoveDocstrings(ast.NodeTransformer):
    """Test helper: remove syntactic docstrings without changing other AST."""
    def _without_docstring(self, node):
        self.generic_visit(node)
        if (node.body and isinstance(node.body[0], ast.Expr)
                and isinstance(node.body[0].value, ast.Constant)
                and isinstance(node.body[0].value.value, str)):
            node.body.pop(0)
        return node
    visit_Module = _without_docstring
    visit_ClassDef = _without_docstring
    visit_FunctionDef = _without_docstring
    visit_AsyncFunctionDef = _without_docstring


def _short_names():
    for width in range(1, 4):
        for chars in itertools.product(string.ascii_lowercase, repeat=width):
            candidate = "".join(chars)
            if not keyword.iskeyword(candidate):
                yield candidate


def _is_public(node):
    return any(isinstance(item, ast.Attribute) and isinstance(item.value, ast.Attribute)
               and isinstance(item.value.value, ast.Name) and item.value.value.id == "gl"
               and item.value.attr == "public" for item in node.decorator_list)


_SCOPES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ListComp,
           ast.SetComp, ast.DictComp, ast.GeneratorExp)


def _has_nested_scope(node):
    return any(isinstance(child, _SCOPES) for child in ast.walk(node) if child is not node)


def _walk_own(node):
    for child in ast.iter_child_nodes(node):
        if isinstance(child, _SCOPES):
            continue
        yield child
        yield from _walk_own(child)


def _docstring_spans(tree):
    spans = []
    for node in ast.walk(tree):
        body = getattr(node, "body", None)
        if isinstance(body, list) and body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
            value = body[0].value
            if isinstance(value.value, str):
                spans.append(((value.lineno, value.col_offset),
                              (value.end_lineno, value.end_col_offset)))
    return spans


def _error_literals(tree):
    """Deployment errors are intentionally compact; source retains diagnostics."""
    spans = set()
    for node in ast.walk(tree):
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == "UserError" and node.args
                and isinstance(node.args[0], ast.Constant)
                and isinstance(node.args[0].value, str)):
            spans.add((node.args[0].lineno, node.args[0].col_offset))
    return spans


def _inside(position, spans):
    return any(start <= position < end for start, end in spans)


def _replacement_plan(tree):
    """Return global-private and exact-position local identifier replacements."""
    names = _short_names()
    private = {}
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name.startswith("_"):
            private[node.name] = next(names)
    voxen = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "Voxen")
    for node in voxen.body:
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            private[node.target.id] = next(names)
        elif isinstance(node, ast.FunctionDef) and node.name.startswith("_") and node.name != "__init__":
            private[node.name] = next(names)

    # Function-local bindings shadow every module-level binding, including
    # compacted private helpers.  Reserve those names before allocating locals:
    # otherwise `_helper -> a` and `local = _helper(...) -> a = a(...)` makes
    # the call resolve to the uninitialized local at runtime.  Imports are
    # included explicitly because proxy/interface constructors such as Address
    # may come from wildcard imports and must never be captured by a local.
    # EthContract is a module-level interface declared by Voxen and is likewise
    # reserved: the native GEN check must continue to call that proxy.
    reserved_local_names = set(private.values())
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            reserved_local_names.add(node.name)
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else (node.target,)
            reserved_local_names.update(target.id for target in targets if isinstance(target, ast.Name))
        elif isinstance(node, ast.Import):
            reserved_local_names.update(alias.asname or alias.name.split(".")[0]
                                        for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            reserved_local_names.update(alias.asname or alias.name for alias in node.names
                                        if alias.name != "*")
    reserved_local_names.add("EthContract")
    local = {}
    for function in ast.walk(tree):
        if not isinstance(function, ast.FunctionDef) or _has_nested_scope(function):
            continue
        bindings = []
        public_args = {arg.arg for arg in (*function.args.posonlyargs, *function.args.args,
                                           *function.args.kwonlyargs)}
        if not _is_public(function):
            bindings.extend(arg for arg in (*function.args.posonlyargs, *function.args.args,
                                             *function.args.kwonlyargs) if arg.arg != "self")
        own = [function, *_walk_own(function)]
        bindings.extend(node for node in own if isinstance(node, ast.Name)
                        and isinstance(node.ctx, (ast.Store, ast.Del)))
        mapping, shorts = {}, (name for name in _short_names()
                               if name not in reserved_local_names and not keyword.iskeyword(name))
        for binding in bindings:
            name = binding.arg if isinstance(binding, ast.arg) else binding.id
            if name != "self" and name not in public_args and name not in mapping:
                mapping[name] = next(shorts)
        for node in own:
            if isinstance(node, ast.Name) and node.id in mapping:
                local[(node.lineno, node.col_offset)] = mapping[node.id]
            elif isinstance(node, ast.arg) and node.arg in mapping:
                local[(node.lineno, node.col_offset)] = mapping[node.arg]
    return private, local


def _token_minify(source):
    """Minify source lexically; no formatter or AST serialization is involved."""
    tree = ast.parse(source)
    private, local = _replacement_plan(tree)
    docs = _docstring_spans(tree)
    errors = _error_literals(tree)
    output, previous = [], None
    level, line_start = 0, True
    for token in tokenize.generate_tokens(io.StringIO(source).readline):
        kind, value, start = token.type, token.string, token.start
        if kind in (tokenize.ENCODING, tokenize.COMMENT, tokenize.NL, tokenize.ENDMARKER):
            continue
        if _inside(start, docs):
            continue
        if kind == tokenize.INDENT:
            level += 1
            continue
        if kind == tokenize.DEDENT:
            level -= 1
            continue
        if kind == tokenize.NEWLINE:
            if output and output[-1] != "\n": output.append("\n")
            previous, line_start = None, True
            continue
        if line_start:
            output.append(" " * level)
            line_start = False
        if kind == tokenize.NAME:
            value = local.get(start, private.get(value, value))
        elif kind == tokenize.STRING and start in errors:
            value = '"E"'
        if (previous is not None and (previous[-1:].isalnum() or previous[-1:] == "_")
                and (value[:1].isalnum() or value[:1] == "_")):
            output.append(" ")
        output.append(value)
        previous = value
    return "".join(output).rstrip() + "\n"


def compact_source(source):
    lines = source.splitlines()
    if not lines or not lines[0].startswith('# { "Depends": '):
        raise ValueError("Voxen source must start with the GenVM Depends directive")
    return lines[0] + "\n" + _token_minify(source)


def build(source=SOURCE, artifact=ARTIFACT):
    artifact.parent.mkdir(parents=True, exist_ok=True)
    artifact.write_text(compact_source(source.read_text()), encoding="utf-8", newline="\n")
    return artifact


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if artifact is stale")
    args = parser.parse_args()
    output = compact_source(SOURCE.read_text())
    if args.check:
        if not ARTIFACT.exists() or ARTIFACT.read_text() != output:
            raise SystemExit("artifacts/voxen.compact.py is stale; run tools/build_voxen_compact.py")
    else:
        build()
