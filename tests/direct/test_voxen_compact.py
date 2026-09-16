"""Regression checks for the generated Voxen deployment artifact."""
import ast
import importlib.util
from pathlib import Path
import subprocess
import pytest
from gltest.direct import create_address

ROOT = Path(__file__).resolve().parents[2]
_SPEC = importlib.util.spec_from_file_location("build_voxen_compact", ROOT / "tools" / "build_voxen_compact.py")
_BUILD = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_BUILD)
ARTIFACT = _BUILD.ARTIFACT
SOURCE = _BUILD.SOURCE
_RemoveDocstrings = _BUILD._RemoveDocstrings
build = _BUILD.build
compact_source = _BUILD.compact_source


def _tree(path):
    tree = ast.parse(path.read_text())
    tree = _RemoveDocstrings().visit(tree)
    ast.fix_missing_locations(tree)
    return tree


def _voxen_class(tree):
    return next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "Voxen")


def _public_methods(tree):
    return [node for node in _voxen_class(tree).body if isinstance(node, ast.FunctionDef)
            and any(isinstance(decorator, ast.Attribute)
                    and isinstance(decorator.value, ast.Attribute)
                    and isinstance(decorator.value.value, ast.Name)
                    and decorator.value.value.id == "gl"
                    and decorator.value.attr == "public"
                    for decorator in node.decorator_list)]


def test_compact_artifact_is_deterministic_and_current():
    build()
    expected = compact_source(SOURCE.read_text())
    assert ARTIFACT.read_text() == expected
    assert compact_source(SOURCE.read_text()) == expected


def test_compact_artifact_has_required_directive_and_valid_python():
    build()
    artifact = ARTIFACT.read_text()
    assert artifact.splitlines()[0] == SOURCE.read_text().splitlines()[0]
    compile(artifact, str(ARTIFACT), "exec")


def test_compact_artifact_uses_deterministic_datetime_and_has_no_message_raw():
    build()
    artifact = ARTIFACT.read_text()
    assert "gl.message_raw" not in artifact
    assert "datetime.datetime.now(datetime.timezone.utc).timestamp()" in artifact


def test_compact_artifact_uses_batched_poap_json_rpc():
    build()
    artifact = ARTIFACT.read_text()
    assert "nondet.web.post" in artifact
    assert "0x2f745c59" in artifact and "0x127a5298" in artifact


def test_compact_artifact_preserves_the_public_contract_surface():
    build()
    source, artifact = _voxen_class(_tree(SOURCE)), _voxen_class(_tree(ARTIFACT))
    assert source.name == artifact.name == "Voxen"
    assert [node.name for node in _public_methods(_tree(SOURCE))] == [
        node.name for node in _public_methods(_tree(ARTIFACT))]


def test_all_public_signatures_and_decorators_are_identical():
    build()
    source_methods = _public_methods(_tree(SOURCE))
    artifact_methods = _public_methods(_tree(ARTIFACT))
    # The intentionally slim deployment ABI has 16 retained public methods.
    assert len(source_methods) == len(artifact_methods) == 16
    assert [node.name for node in source_methods] == [node.name for node in artifact_methods]
    for source, artifact in zip(source_methods, artifact_methods):
        assert ast.dump(source.args, include_attributes=False) == ast.dump(artifact.args, include_attributes=False)
        assert ast.dump(source.returns, include_attributes=False) == ast.dump(artifact.returns, include_attributes=False)
        assert [ast.dump(item, include_attributes=False) for item in source.decorator_list] == [
            ast.dump(item, include_attributes=False) for item in artifact.decorator_list]


def test_storage_schema_is_identical_and_deployment_errors_are_compacted():
    build()
    source_tree, artifact_tree = _tree(SOURCE), _tree(ARTIFACT)
    source_class, artifact_class = _voxen_class(source_tree), _voxen_class(artifact_tree)
    source_storage = [node for node in source_class.body if isinstance(node, ast.AnnAssign)]
    artifact_storage = [node for node in artifact_class.body if isinstance(node, ast.AnnAssign)]
    assert len(source_storage) == len(artifact_storage)
    assert [ast.dump(node.annotation, include_attributes=False) for node in source_storage] == [
        ast.dump(node.annotation, include_attributes=False) for node in artifact_storage]
    assert '"E"' in ARTIFACT.read_text()


def test_review_prompt_retains_every_safety_requirement():
    source = SOURCE.read_text()
    for required in ("governance compliance only", "never decide votes, winners, or ties",
                     "untrusted data", "do not change role/schema", "invent evidence",
                     "Return exactly JSON fields", "independent validator must agree",
                     "current governance-rules revision"):
        assert required in source


def test_check_detects_a_stale_artifact():
    build()
    original = ARTIFACT.read_text()
    try:
        ARTIFACT.write_text(original + "# stale\n")
        result = subprocess.run(["python3", "tools/build_voxen_compact.py", "--check"],
                                cwd=ROOT, capture_output=True, text=True)
        assert result.returncode != 0
        assert "stale" in result.stderr
    finally:
        ARTIFACT.write_text(original)


def test_runtime_schema_is_identical_in_direct_mode(direct_deploy):
    build()
    compact = direct_deploy(str(ARTIFACT))
    from genlayer.py.get_schema import get_schema
    schema = get_schema(type(compact._instance))["methods"]
    public = _public_methods(_tree(SOURCE))
    assert set(schema) == {method.name for method in public}
    for method in public:
        decorator = method.decorator_list[0]
        assert schema[method.name]["readonly"] == (decorator.attr == "view")


def test_compact_public_lifecycle_matches_canonical_behavior(direct_vm, direct_deploy):
    direct_vm.sender = create_address("compact-equivalence-owner")
    direct_vm.warp("2026-09-08T12:00:00Z")
    contract = direct_deploy(str(ARTIFACT))
    space_id = contract.create_space("Equivalence community", governance_rules="Be fair")
    proposal_id = contract.create_proposal(
        "Choose", "Equivalent lifecycle", ["A", "B"], 1, 2,
        "POAP_EVENT", space_id, poap_event_id=7)
    assert contract.get_space(space_id)["id"] == space_id
    assert contract.get_space_ids() == {"ids": [space_id], "total": 1, "next_offset": None}
    assert contract.get_proposal(proposal_id)["status"] == "PUBLISHED"
    assert contract.get_proposal_ids() == {"ids": [proposal_id], "total": 1, "next_offset": None}


def test_compact_artifact_retains_poap_consensus_and_removes_legacy_eligibility():
    build()
    artifact = ARTIFACT.read_text()
    assert "PUBLIC" in artifact and "POAP_EVENT" in artifact and "POAP_SCAN_LIMIT_EXCEEDED" in artifact
    assert "POAP_NFT" not in artifact and '"GEN"' not in artifact


def test_compact_artifact_has_no_self_shadowing_call_from_renaming():
    build()
    tree = ast.parse(ARTIFACT.read_text())
    broken = []
    for function in ast.walk(tree):
        if not isinstance(function, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for node in ast.walk(function):
            if (isinstance(node, ast.Assign) and len(node.targets) == 1
                    and isinstance(node.targets[0], ast.Name)
                    and isinstance(node.value, ast.Call)
                    and isinstance(node.value.func, ast.Name)
                    and node.targets[0].id == node.value.func.id):
                broken.append((function.name, node.targets[0].id))
    assert broken == []
