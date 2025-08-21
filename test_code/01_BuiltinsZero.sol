// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BuiltinsZero {
    function zeroMath(
        uint a,
        uint b,
        uint m
    ) public pure returns (uint s, uint p) {
        s = addmod(a, b, m); // 0-call
        p = mulmod(a, b, m); // 0-call
    }

    function zeroHash(bytes memory data) public pure returns (bytes32) {
        return keccak256(data); // 0-call
    }

    function zeroBlock() public view returns (bytes32) {
        if (block.number == 0) return bytes32(0);
        return blockhash(block.number - 1); // 0-call
    }

    function zeroGas() public view returns (uint) {
        return gasleft(); // 0-call
    }

    function zeroRevert(bool withReason) public pure {
        if (withReason) revert("boom"); // 0-call
        revert(); // 0-call
    }
}
