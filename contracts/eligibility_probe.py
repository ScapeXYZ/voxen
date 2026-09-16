# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""V0.5.2.1 experimental transport probe, never an authorization source for Voxen."""
import json
import datetime
import _genlayer_wasi as wasi
from genlayer import *
from genlayer.py.evm.calldata import MethodEncoder
import genlayer.gl._internal.gl_call as gl_call


@gl.evm.contract_interface
class ERC721Credential:
    class View:
        def balanceOf(self, owner: Address, /) -> u256: ...
    class Write:
        pass


@gl.evm.contract_interface
class ERC1155Credential:
    class View:
        def balanceOf(self, account: Address, token_id: u256, /) -> u256: ...
    class Write:
        pass


@gl.evm.contract_interface
class NativeBalanceCandidate:
    """Address balance transport only; no claim that the target is a contract."""
    class View:
        pass
    class Write:
        pass



# Deployment trust boundary: Bradbury EVM, NOT gl.message.chain_id (reports 1).
TRUSTED_EVM_CHAIN_ID = 4221


def _native_balance(owner):
    # Same WASI get_balance used by the probe's SDK .balance proxy. Validate
    # before SDK u256/int coercion so bool/string/overflow cannot become balances.
    observed = wasi.get_balance(owner.as_bytes)
    if type(observed) is not int or not 0 <= observed < 2**256:
        raise gl.vm.UserError("Native balance verification unavailable")
    return observed


def _credential_balance(target, owner, standard, token_id):
    if standard == "ERC721":
        if token_id is not None:
            raise gl.vm.UserError("ERC721 collection check has no token ID")
        types, args = (Address,), (owner,)
    elif standard == "ERC1155":
        if type(token_id) is not int or not 0 <= token_id < 2**256:
            raise gl.vm.UserError("Invalid token ID")
        types, args = (Address, u256), (owner, u256(token_id))
    else:
        raise gl.vm.UserError("Unsupported credential type")
    calldata = MethodEncoder("balanceOf", types, u256).encode_call(args)

    def decode_balance(raw):
        if type(raw) is not bytes or len(raw) != 32:
            raise gl.vm.UserError("Malformed uint256 response")
        return int.from_bytes(raw, "big")

    observed = gl_call.gl_call_generic(
        {"EthCall": {"address": target, "calldata": calldata}}, decode_balance).get()
    if type(observed) is not int or not 0 <= observed < 2**256:
        raise gl.vm.UserError("Credential verification unavailable")
    return observed


class EligibilityProbe(gl.Contract):
    last_native_candidate_json: str

    def __init__(self):
        self.last_native_candidate_json = "null"

    def _address(self, value):
        if (type(value) is not str or len(value) != 42 or not value.startswith("0x")
                or any(c not in "0123456789abcdefABCDEF" for c in value[2:])):
            raise gl.vm.UserError("Invalid EVM address")
        addr = Address(value)
        if addr.as_bytes == bytes(20):
            raise gl.vm.UserError("Zero address")
        if value[2:] not in (value[2:].lower(), value[2:].upper()) and value != addr.as_hex:
            raise gl.vm.UserError("Invalid checksum")
        return addr

    def _network_context(self):
        # PROBE ONLY: host execution metadata does not establish the EVM network.
        # Deployment/application context must pin RPC, chain and contract identity.
        return {"runtime_chain_id": int(gl.message.chain_id),
                "configured_target_evm_chain_id": 4221,
                "network_verification_status": "UNPROVEN_RUNTIME_CHAIN_ID",
                "probe_only": True, "eligible": None}

    @gl.public.view
    def context(self) -> dict:
        return {**self._network_context(),
                "caller": gl.message.sender_address.as_hex,
                "contract": gl.message.contract_address.as_hex,
                "sender_address": gl.message.sender_address.as_hex,
                "origin_address": gl.message.origin_address.as_hex,
                "contract_address": gl.message.contract_address.as_hex,
                # Retained context alias: runtime metadata, NOT eth_chainId.
                "chain_id": int(gl.message.chain_id),
                "runtime_datetime": datetime.datetime.now(datetime.timezone.utc).isoformat()}

    @gl.public.view
    def native_candidate(self, threshold_wei: int) -> dict:
        """Observe WASI get_balance through SDK proxy; EOA semantics NOT established."""
        if type(threshold_wei) is not int or not 0 < threshold_wei < 2**256:
            raise gl.vm.UserError("Invalid GEN threshold")
        caller = gl.message.sender_address
        observed = _native_balance(caller)
        return {**self._network_context(), "caller": caller.as_hex, "observed_candidate_wei": str(observed),
                "threshold_wei": str(threshold_wei), "candidate_meets_threshold": observed >= threshold_wei,
                "eligible": None, "verification_status": "UNPROVEN_EOA_BALANCE_SEMANTICS"}

    @gl.public.write
    def record_native_candidate(self, threshold_wei: int) -> None:
        """Persist caller balance evidence only; never authorize or transfer funds."""
        record = self.native_candidate(threshold_wei)
        # GenVM's deterministic transaction clock is metadata, never freshness proof.
        record["runtime_datetime"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        # Finish validation, balance read, metadata and serialization before mutation.
        encoded = json.dumps(record, sort_keys=True)
        self.last_native_candidate_json = encoded

    @gl.public.view
    def get_last_native_candidate(self) -> dict | None:
        """Last successful experiment (any caller), or None before the first write."""
        return json.loads(self.last_native_candidate_json)

    def _cli_address(self, value):
        """Accept only SDK Address or CLI numeric hex (not Address.as_int)."""
        if type(value) is Address:
            encoded = value.as_hex
        elif type(value) is int and 0 < value < 2**160:
            encoded = "0x" + value.to_bytes(20, "big").hex()
        else:
            raise gl.vm.UserError("Invalid EVM address")
        return self._address(encoded).as_hex

    @gl.public.view
    def nft_addresses(self, contract: Address, wallet: Address, credential_type: str,
                      token_id: int | None = None, use_raw_transport: bool = False) -> dict:
        """CLI 0.39.2 may decode hex arguments as Address or Python int."""
        return self.nft_candidate(self._cli_address(contract), self._cli_address(wallet), credential_type,
                                  token_id, use_raw_transport)

    @gl.public.view
    def nft_candidate(self, contract: str, wallet: str, credential_type: str,
                      token_id: int | None = None, use_raw_transport: bool = False) -> dict:
        """Raw path uses installed SDK internals; result is probe evidence only."""
        target, owner = self._address(contract), self._address(wallet)
        if type(use_raw_transport) is not bool:
            raise gl.vm.UserError("Invalid transport flag")
        if credential_type == "ERC721":
            if token_id is not None:
                raise gl.vm.UserError("ERC721 collection check has no token ID")
            types, args = (Address,), (owner,)
        elif credential_type == "ERC1155":
            if type(token_id) is not int or not 0 <= token_id < 2**256:
                raise gl.vm.UserError("Invalid token ID")
            types, args = (Address, u256), (owner, u256(token_id))
        else:
            raise gl.vm.UserError("Unsupported credential type")
        if use_raw_transport:
            observed = _credential_balance(target, owner, credential_type, token_id)
        elif credential_type == "ERC721":
            observed = int(ERC721Credential(target).view().balanceOf(owner))
        else:
            observed = int(ERC1155Credential(target).view().balanceOf(owner, u256(token_id)))
        return {**self._network_context(), "wallet": owner.as_hex, "contract": target.as_hex,
                "credential_type": credential_type, "token_id": str(token_id) if token_id is not None else None,
                "observed_balance": str(observed), "candidate_holds_credential": observed > 0,
                "eligible": None, "verification_status": "PROBE_ONLY_NOT_AUTHORIZATION"}
