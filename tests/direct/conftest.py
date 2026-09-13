"""Shared helpers for direct mode tests."""
import pytest


def to_hex(addr_bytes):
    """Convert address bytes to checksummed hex matching contract output.

    The contract's get_bets()/get_points() return keys via Address.as_hex,
    which produces EIP-55 checksummed hex. Call after direct_deploy so the
    SDK is on sys.path.
    """
    if hasattr(addr_bytes, "as_hex"):
        return addr_bytes.as_hex
    from genlayer.py.types import Address

    return Address(addr_bytes).as_hex


@pytest.fixture
def credential_interfaces():
    """Test-only ABI declarations for the pinned SDK proxy regression."""
    from genlayer import Address, gl, u256

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

    return ERC721Credential, ERC1155Credential
