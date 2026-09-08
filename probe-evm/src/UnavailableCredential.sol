// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// Controlled failure fixtures only; neither contract is a credential.
contract MalformedCredential {
    fallback() external {
        assembly {
            mstore(0, 1)
            return(0, 31)
        }
    }
}

contract RevertingCredential {
    fallback() external {
        revert("controlled credential unavailable");
    }
}
