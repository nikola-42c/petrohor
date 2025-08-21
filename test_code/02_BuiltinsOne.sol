// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BuiltinsOne {
    // abi.decode
    function decodeBlob(
        bytes memory blob
    ) public pure returns (uint a, address b) {
        (a, b) = abi.decode(blob, (uint, address)); // 1-call
    }

    // sha256, ripemd160
    function hashers(
        bytes memory data
    ) public pure returns (bytes32 s, bytes20 r) {
        s = sha256(data); // 1-call
        r = ripemd160(data); // 1-call
    }

    // ecrecover (with 0-weight keccak256)
    function recover(bytes memory msgData) public pure returns (address rec) {
        bytes32 h = keccak256(msgData); // 0-call
        rec = ecrecover(h, 27, bytes32(0), bytes32(0)); // 1-call
    }

    // .call / .delegatecall / .staticcall (no require; use revert which is 0)
    function lowLevel(
        address target,
        bytes memory payload
    ) public payable returns (bytes memory out) {
        (bool ok1, bytes memory r1) = payable(target).call{value: 0}(payload); // 1-call
        if (!ok1) revert("call failed"); // 0-call

        (bool ok2, ) = target.delegatecall(payload); // 1-call
        if (!ok2) revert("delegatecall failed"); // 0-call

        (bool ok3, bytes memory r3) = target.staticcall(payload); // 1-call
        if (!ok3) revert("staticcall failed"); // 0-call

        out = r1.length > 0 ? r1 : r3;
    }

    // selfdestruct
    function nuke(address payable to) public payable {
        selfdestruct(to); // 1-call
    }

    receive() external payable {}
}
