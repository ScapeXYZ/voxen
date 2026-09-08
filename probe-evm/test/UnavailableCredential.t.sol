// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MalformedCredential, RevertingCredential} from "../src/UnavailableCredential.sol";

contract UnavailableCredentialTest {
    function testControlledErrorsForBothSelectors() public {
        address malformed = address(new MalformedCredential());
        address unavailable = address(new RevertingCredential());
        require(malformed.code.length > 0 && unavailable.code.length > 0);
        bytes[2] memory queries = [
            abi.encodeWithSignature("balanceOf(address)", address(0x1001)),
            abi.encodeWithSignature("balanceOf(address,uint256)", address(0x1001), 501)
        ];
        for (uint256 i; i < queries.length; i++) {
            (bool ok, bytes memory result) = malformed.staticcall(queries[i]);
            require(ok && result.length == 31);
            (ok, result) = unavailable.staticcall(queries[i]);
            require(!ok && result.length > 0);
        }
    }
}
