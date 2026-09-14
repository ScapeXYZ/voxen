# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import _genlayer_wasi as wasi


class BalanceWriteProbe(gl.Contract):
    last_balance: u256

    def __init__(self):
        self.last_balance = u256(0)

    @gl.public.view
    def read_balance(self) -> int:
        owner = Address(str(gl.message.sender_address))
        return wasi.get_balance(owner.as_bytes)

    @gl.public.write
    def store_balance(self) -> None:
        owner = Address(str(gl.message.sender_address))
        observed = wasi.get_balance(owner.as_bytes)

        if type(observed) is not int or not 0 <= observed < 2**256:
            raise gl.vm.UserError("Balance unavailable")

        self.last_balance = u256(observed)

    @gl.public.view
    def get_stored_balance(self) -> int:
        return int(self.last_balance)
