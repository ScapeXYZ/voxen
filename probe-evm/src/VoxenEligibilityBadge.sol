// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// Controlled transport proof only. Not the GenLayer AMA credential.
/// One constructor mint; no admin, upgrade, or subsequent mint function.
contract VoxenEligibilityBadge721 is ERC721 {
    constructor(address holder) ERC721("Voxen Test Event Credential", "VXTEST") {
        _safeMint(holder, 1);
    }
}

/// Explicit test event token ID 501, unrelated to any display label.
contract VoxenEligibilityBadge1155 is ERC1155 {
    constructor(address holder) ERC1155("") {
        _mint(holder, 501, 1, "");
    }
}
