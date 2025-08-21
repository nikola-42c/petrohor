// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Mix {
    event Done(bytes data);

    // user-defined building blocks
    function inc(uint x) public pure returns (uint) {
        return x + 1;
    }

    function dbl(uint x) public pure returns (uint) {
        return x * 2;
    }

    function sq(uint x) public pure returns (uint) {
        return x * x;
    }

    function nested(uint x) public pure returns (uint) {
        return sq(dbl(inc(x))); // 3 user-defined calls
    }

    function mega(
        address target,
        address payable payee,
        bytes memory data
    ) public payable returns (bytes memory out) {
        uint v = nested(5);

        bytes memory payload = abi.encodeWithSelector(this.echo.selector, data); // 2
        (bool ok, bytes memory ret) = target.staticcall(payload); // 1
        if (!ok) revert("staticcall failed"); // 0

        payee.transfer(1 wei); // 2
        bytes32 d = sha256(data); // 1
        out = abi.encode(ret, v, d); // 2
    }

    function echo(bytes calldata x) external {
        emit Done(x);
    }

    receive() external payable {}
}
