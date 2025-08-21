// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Test {
    // Simple building blocks
    function inc(uint x) public pure returns (uint) {
        return x + 1;
    }

    function dbl(uint x) public pure returns (uint) {
        return x * 2;
    }

    function sq(uint x) public pure returns (uint) {
        return x * x;
    }

    // Nested user-only calls
    function n1(uint x) public pure returns (uint) {
        return inc(x); // depth 1
    }

    function n2(uint x) public pure returns (uint) {
        return dbl(inc(x)); // depth 2
    }

    function n3(uint x) public pure returns (uint) {
        return sq(dbl(inc(x))); // depth 3
    }

    function n4(uint x) public pure returns (uint) {
        // Multiple branches of nesting
        return sq(dbl(inc(inc(x)))) + n3(inc(x)); // depths 4 and (n3->3 + 1 arg) respectively
    }

    // Mega: a clearly deep chain
    function mega(uint x) public pure returns (uint) {
        return sq(sq(dbl(inc(dbl(inc(x)))))); // deep nesting chain
    }
}
