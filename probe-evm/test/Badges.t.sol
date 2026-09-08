// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VoxenEligibilityBadge721, VoxenEligibilityBadge1155} from "../src/VoxenEligibilityBadge.sol";

interface Vm {
    function prank(address sender) external;
}

contract BadgesTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant HOLDER = address(0x1001);
    address constant EMPTY = address(0x1002);

    function test721OwnershipAndTransfer() public {
        VoxenEligibilityBadge721 badge = new VoxenEligibilityBadge721(HOLDER);
        require(badge.balanceOf(HOLDER) == 1 && badge.balanceOf(EMPTY) == 0);
        require(badge.supportsInterface(0x80ac58cd));
        vm.prank(HOLDER);
        badge.transferFrom(HOLDER, EMPTY, 1);
        require(badge.balanceOf(HOLDER) == 0 && badge.balanceOf(EMPTY) == 1);
    }

    function test1155OwnershipAndTransfer() public {
        VoxenEligibilityBadge1155 badge = new VoxenEligibilityBadge1155(HOLDER);
        require(badge.balanceOf(HOLDER, 501) == 1 && badge.balanceOf(EMPTY, 501) == 0);
        require(badge.balanceOf(HOLDER, 0) == 0 && badge.balanceOf(HOLDER, 72) == 0);
        require(badge.supportsInterface(0xd9b67a26));
        vm.prank(HOLDER);
        badge.safeTransferFrom(HOLDER, EMPTY, 501, 1, "");
        require(badge.balanceOf(HOLDER, 501) == 0 && badge.balanceOf(EMPTY, 501) == 1);
    }
}
