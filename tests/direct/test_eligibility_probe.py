"""Local transport/ABI checks only. Mocked values are not live ownership proof."""
import pytest
from gltest.direct import create_address

WALLET = create_address("probe-wallet")
TARGET = "0x" + create_address("probe-target").hex()


@pytest.fixture
def probe(direct_vm, direct_deploy, monkeypatch, request):
    direct_vm.sender = WALLET
    monkeypatch.setattr(direct_vm, "_chain_id", getattr(request, "param", 1))
    deployed = direct_deploy("contracts/eligibility_probe.py")
    return deployed


@pytest.mark.parametrize("probe", [1, 4221, 61127], indirect=True)
def test_context(probe, direct_vm):
    from genlayer.py import calldata
    result = probe.context()
    assert result["caller"].lower() == "0x" + WALLET.hex()
    assert result["sender_address"] == result["caller"]
    assert result["contract_address"] == result["contract"]
    assert result["chain_id"] == result["runtime_chain_id"] == direct_vm._chain_id
    raw = result["message_raw"]
    assert int(raw["chain_id"]) == result["runtime_chain_id"]
    for field in ("sender_address", "origin_address", "contract_address"):
        assert raw[field].as_hex == result[field]
    assert calldata.decode(calldata.encode(result)) == result
    assert_unproven_network(result, direct_vm._chain_id)


def test_context_preserves_distinct_origin(probe, direct_vm):
    origin = create_address("probe-origin")
    direct_vm.origin = origin
    result = probe.context()
    assert result["origin_address"] == origin.as_hex
    assert result["sender_address"].lower() == "0x" + WALLET.hex()
    assert result["message_raw"]["origin_address"].as_hex == result["origin_address"]
    assert result["message_raw"]["sender_address"].as_hex == result["sender_address"]


def assert_unproven_network(result, chain_id):
    assert result["runtime_chain_id"] == chain_id
    assert result["configured_target_evm_chain_id"] == 4221
    assert result["network_verification_status"] == "UNPROVEN_RUNTIME_CHAIN_ID"
    assert result["probe_only"] is True
    assert result["eligible"] is None


@pytest.mark.parametrize("threshold,expected", [(10, True), (11, False)])
def test_native_candidate_is_not_proof(probe, direct_vm, threshold, expected):
    direct_vm.deal(WALLET, 10)
    result = probe.native_candidate(threshold)
    assert result["observed_candidate_wei"] == "10"
    assert result["candidate_meets_threshold"] is expected
    assert result["eligible"] is None


@pytest.mark.parametrize("kind,token,selector", [("ERC721", None, "70a08231"), ("ERC1155", 501, "00fdd58e"), ("ERC1155", 0, "00fdd58e"), ("ERC1155", 502, "00fdd58e")])
@pytest.mark.parametrize("balance", [0, 1, 2**256 - 1])
def test_raw_transport(probe, monkeypatch, kind, token, selector, balance):
    import genlayer.gl._internal.gl_call as calls
    from genlayer.py.types import Lazy

    def transport(request, decode):
        data = request["EthCall"]
        expected = bytes.fromhex(selector) + bytes(12) + WALLET
        if token is not None:
            expected += token.to_bytes(32, "big")
        assert data["calldata"] == expected
        assert data["address"].as_hex.lower() == TARGET
        return Lazy(lambda: decode(balance.to_bytes(32, "big")))

    monkeypatch.setattr(calls, "gl_call_generic", transport)
    result = probe.nft_candidate(TARGET, "0x" + WALLET.hex(), kind, token, True)
    assert_unproven_network(result, 1)
    assert result["observed_balance"] == str(balance)
    assert result["candidate_holds_credential"] is (balance > 0)
    assert result["eligible"] is None
    from genlayer import Address
    assert probe.nft_addresses(Address(TARGET), Address(WALLET), kind, token, True) == result


@pytest.mark.parametrize("raw", [b"", bytes(31), bytes(33), None])
@pytest.mark.parametrize("kind,token", [("ERC721", None), ("ERC1155", 501)])
def test_malformed_response_rejected(probe, kind, token, monkeypatch, raw):
    import genlayer.gl._internal.gl_call as calls
    from genlayer.py.types import Lazy
    from genlayer import gl
    monkeypatch.setattr(calls, "gl_call_generic", lambda request, decode: Lazy(lambda: decode(raw)))
    with pytest.raises(gl.vm.UserError, match="Malformed"):
        probe.nft_candidate(TARGET, "0x" + WALLET.hex(), kind, token, True)


@pytest.mark.parametrize("kind,token", [("ERC721", None), ("ERC1155", 501)])
def test_transport_error_propagates(probe, kind, token, monkeypatch):
    import genlayer.gl._internal.gl_call as calls
    def failure(*args):
        raise OSError("unavailable")
    monkeypatch.setattr(calls, "gl_call_generic", failure)
    with pytest.raises(OSError):
        probe.nft_candidate(TARGET, "0x" + WALLET.hex(), kind, token, True)


@pytest.mark.parametrize("kind,token", [("ERC721", None), ("ERC1155", 1)])
def test_unmodified_sdk_defect(probe, kind, token):
    with pytest.raises(AttributeError, match="parent"):
        probe.nft_candidate(TARGET, "0x" + WALLET.hex(), kind, token)


@pytest.mark.parametrize("kind,token", [("POAP", None), ("ERC721", 72), ("ERC1155", None), ("ERC1155", -1), ("ERC1155", True)])
def test_invalid_config(probe, kind, token):
    from genlayer import gl
    with pytest.raises(gl.vm.UserError):
        probe.nft_candidate(TARGET, "0x" + WALLET.hex(), kind, token, True)


@pytest.mark.parametrize("probe", [1, 4221, 61127], indirect=True)
def test_native_runtime_chain_does_not_authorize(probe, direct_vm):
    direct_vm.deal(WALLET, 10)
    result = probe.native_candidate(1)
    assert result["candidate_meets_threshold"] is True
    assert result["verification_status"] == "UNPROVEN_EOA_BALANCE_SEMANTICS"
    assert_unproven_network(result, direct_vm._chain_id)
    assert "chain_id" not in result


def test_schema(probe):
    from genlayer.py.get_schema import get_schema
    schema = get_schema(type(probe._instance))
    methods = schema["methods"]
    assert {name for name, method in methods.items() if not method["readonly"]} == {"record_native_candidate"}
    assert methods["get_last_native_candidate"]["readonly"] is True


@pytest.mark.parametrize("value", [None, True, -1, 2**256, "1"])
@pytest.mark.parametrize("kind,token", [("ERC721", None), ("ERC1155", 501)])
def test_unavailable_or_invalid_transport_result(probe, kind, token, monkeypatch, value):
    import genlayer.gl._internal.gl_call as calls
    from genlayer.py.types import Lazy
    from genlayer import gl
    monkeypatch.setattr(calls, "gl_call_generic", lambda request, decode: Lazy(lambda: value))
    with pytest.raises(gl.vm.UserError, match="unavailable"):
        probe.nft_candidate(TARGET, "0x" + WALLET.hex(), kind, token, True)


@pytest.mark.parametrize("threshold", [0, -1, True, 2**256])
def test_invalid_native_threshold(probe, threshold):
    from genlayer import gl
    with pytest.raises(gl.vm.UserError, match="threshold"):
        probe.native_candidate(threshold)


@pytest.mark.parametrize("bad", ["0x" + "0" * 40, "bad", "0x" + "g" * 40])
@pytest.mark.parametrize("field", ["contract", "wallet"])
def test_invalid_address(probe, bad, field):
    from genlayer import gl
    args = {"contract": TARGET, "wallet": "0x" + WALLET.hex()}
    args[field] = bad
    with pytest.raises(gl.vm.UserError):
        probe.nft_candidate(args["contract"], args["wallet"], "ERC721", None, True)


@pytest.mark.parametrize("probe", [1, 4221, 61127], indirect=True)
@pytest.mark.parametrize("kind,token", [("ERC721", None), ("ERC1155", 0)])
def test_nft_runtime_chain_does_not_authorize(probe, direct_vm, monkeypatch, kind, token):
    import genlayer.gl._internal.gl_call as calls
    from genlayer.py.types import Lazy
    monkeypatch.setattr(calls, "gl_call_generic",
                        lambda request, decode: Lazy(lambda: decode((1).to_bytes(32, "big"))))
    result = probe.nft_candidate(TARGET, "0x" + WALLET.hex(), kind, token, True)
    assert result["candidate_holds_credential"] is True
    assert result["verification_status"] == "PROBE_ONLY_NOT_AUTHORIZATION"
    assert_unproven_network(result, direct_vm._chain_id)
    assert "chain_id" not in result


def test_invalid_transport_flag(probe):
    from genlayer import gl
    with pytest.raises(gl.vm.UserError, match="transport"):
        probe.nft_candidate(TARGET, "0x" + WALLET.hex(), "ERC721", None, 1)


@pytest.mark.parametrize("threshold,expected", [(1, True), (10, True), (11, False)])
@pytest.mark.parametrize("probe", [1, 4221, 61127], indirect=True)
def test_record_native_candidate(probe, direct_vm, threshold, expected):
    from genlayer import gl
    assert probe.get_last_native_candidate() is None
    direct_vm.deal(WALLET, 10)
    direct_vm.origin = create_address("different-origin")
    direct_vm.deal(direct_vm.origin, 999)
    assert probe.record_native_candidate(threshold) is None
    record = probe.get_last_native_candidate()
    assert record["caller"].lower() == "0x" + WALLET.hex()
    assert record["observed_candidate_wei"] == "10"
    assert record["threshold_wei"] == str(threshold)
    assert record["candidate_meets_threshold"] is expected
    assert record["runtime_datetime"] == gl.message_raw.get("datetime")
    assert record["verification_status"] == "UNPROVEN_EOA_BALANCE_SEMANTICS"
    assert_unproven_network(record, direct_vm._chain_id)
    # Returned data is detached from stored state; views cannot replace the record.
    record["eligible"] = True
    probe.native_candidate(100)
    assert probe.get_last_native_candidate()["eligible"] is None
    second = create_address("second-probe-caller")
    direct_vm.sender = second
    direct_vm.deal(second, 3)
    probe.record_native_candidate(4)
    assert probe.get_last_native_candidate()["caller"] == second.as_hex
    assert probe.get_last_native_candidate()["observed_candidate_wei"] == "3"
    assert probe.get_last_native_candidate()["candidate_meets_threshold"] is False


@pytest.mark.parametrize("threshold", [0, -1, True, 2**256, "1", None])
def test_invalid_write_preserves_record(probe, direct_vm, threshold):
    from genlayer import gl
    direct_vm.deal(WALLET, 10)
    probe.record_native_candidate(1)
    before = probe.get_last_native_candidate()
    with pytest.raises(gl.vm.UserError, match="threshold"):
        probe.record_native_candidate(threshold)
    assert probe.get_last_native_candidate() == before


@pytest.mark.parametrize("existing", [False, True])
@pytest.mark.parametrize("stage", ["balance", "metadata", "serialization"])
def test_write_failure_has_no_partial_mutation(probe, direct_vm, monkeypatch, existing, stage):
    import sys
    import genlayer.gl._internal.eth as eth
    module = sys.modules[type(probe._instance).__module__]
    direct_vm.deal(WALLET, 10)
    if existing:
        probe.record_native_candidate(1)
    before = probe.get_last_native_candidate()
    stored_before = probe._instance.last_native_candidate_json

    def fail(*args, **kwargs):
        assert probe._instance.last_native_candidate_json == stored_before
        raise RuntimeError("injected failure")

    with monkeypatch.context() as patch:
        if stage == "balance":
            patch.setattr(eth.wasi, "get_balance", fail)
        elif stage == "metadata":
            patch.setattr(type(probe._instance), "_network_context", fail)
        else:
            patch.setattr(module.json, "dumps", fail)
        with pytest.raises(RuntimeError, match="injected failure"):
            probe.record_native_candidate(11)
    assert probe.get_last_native_candidate() == before
    assert probe._instance.last_native_candidate_json == stored_before


def test_write_accepts_no_caller_or_balance(probe):
    with pytest.raises(TypeError):
        probe.record_native_candidate(1, WALLET, 100)
    assert probe.get_last_native_candidate() is None


@pytest.mark.parametrize("timestamp", [None, 123, "2026-09-08T12:00:00Z"])
def test_record_datetime_is_optional_runtime_metadata(probe, direct_vm, monkeypatch, timestamp):
    from genlayer import gl
    direct_vm.deal(WALLET, 10)
    monkeypatch.setitem(gl.message_raw, "datetime", timestamp)
    probe.record_native_candidate(1)
    assert probe.get_last_native_candidate()["runtime_datetime"] == (timestamp if type(timestamp) is str else None)


@pytest.mark.parametrize("target", [
    "0x829463bBd0DC31251E1c21A621Efcc9f04c99065",
    "0xbbF75475cbB35DCd75fE9b4025e75C206421945F",
    "0x" + "0" * 39 + "1",
    "0x" + "f" * 40,
])
@pytest.mark.parametrize("kind,token,selector", [
    ("ERC721", None, "70a08231"), ("ERC1155", 501, "00fdd58e"),
])
@pytest.mark.parametrize("integer_wallet", [False, True])
@pytest.mark.parametrize("outcome", ["balance", "malformed", "revert"])
def test_cli_integer_addresses_reach_transport(
        probe, monkeypatch, target, kind, token, selector, integer_wallet, outcome):
    from genlayer import Address, gl
    from genlayer.py.types import Lazy
    import genlayer.gl._internal.gl_call as calls
    seen = []

    def transport(request, decode):
        seen.append(request)
        assert request["EthCall"]["address"].as_bytes == bytes.fromhex(target[2:])
        expected = bytes.fromhex(selector) + bytes(12) + WALLET
        if token is not None:
            expected += token.to_bytes(32, "big")
        assert request["EthCall"]["calldata"] == expected
        if outcome == "revert":
            raise OSError("fixture reverted")
        raw = bytes(31) if outcome == "malformed" else (1).to_bytes(32, "big")
        return Lazy(lambda: decode(raw))

    monkeypatch.setattr(calls, "gl_call_generic", transport)
    wallet = int.from_bytes(WALLET, "big") if integer_wallet else Address(WALLET)
    if outcome == "balance":
        result = probe.nft_addresses(int(target, 16), wallet, kind, token, True)
        assert result["contract"] == Address(target).as_hex
        assert result["wallet"] == Address(WALLET).as_hex
        assert result["observed_balance"] == "1"
        assert result["verification_status"] == "PROBE_ONLY_NOT_AUTHORIZATION"
        assert_unproven_network(result, 1)
    else:
        error, message = (gl.vm.UserError, "Malformed") if outcome == "malformed" else (OSError, "fixture reverted")
        with pytest.raises(error, match=message):
            probe.nft_addresses(int(target, 16), wallet, kind, token, True)
    assert len(seen) == 1


@pytest.mark.parametrize("field", ["contract", "wallet"])
def test_cli_rejects_invalid_and_unsupported_addresses(probe, monkeypatch, field):
    from genlayer import Address, gl
    import genlayer.gl._internal.gl_call as calls

    class AddressLike:
        as_hex = TARGET

    class IntLike:
        def __int__(self):
            return 1

    class IntSubclass(int):
        pass

    def unexpected(*args):
        pytest.fail("invalid address reached transport")

    monkeypatch.setattr(calls, "gl_call_generic", unexpected)
    for bad in [0, -1, 2**160, 2**256, True, False, None,
                "bad", "0x" + "g" * 40, TARGET, bytes(20), [], {},
                Address(bytes(20))]:
        args = {"contract": Address(TARGET), "wallet": Address(WALLET)}
        args[field] = bad
        with pytest.raises(gl.vm.UserError):
            probe.nft_addresses(args["contract"], args["wallet"], "ERC721", None, True)

    # These types cannot survive calldata encoding; exercise the guard directly.
    for bad in [1.0, AddressLike(), IntLike(), IntSubclass(1)]:
        with pytest.raises(gl.vm.UserError):
            probe._instance._cli_address(bad)


@pytest.mark.parametrize("field", ["contract", "wallet"])
def test_nft_candidate_retains_strict_string_validation(probe, field):
    from genlayer import Address, gl
    checksummed = Address(TARGET).as_hex
    index = next(i for i, c in enumerate(checksummed[2:], 2) if c.isalpha())
    bad_checksum = checksummed[:index] + checksummed[index].swapcase() + checksummed[index + 1:]
    for bad in [int(TARGET, 16), Address(TARGET), True, bad_checksum]:
        args = {"contract": TARGET, "wallet": "0x" + WALLET.hex()}
        args[field] = bad
        with pytest.raises(gl.vm.UserError):
            probe.nft_candidate(args["contract"], args["wallet"], "ERC721", None, True)
