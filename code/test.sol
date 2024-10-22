// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Test {
    uint256 x = 5;
    uint256 y = 4;
    uint256 z = 3;
    uint256 d;

    constructor() {
        if (x > y) {
            d = x;
            if (x > z) {
                d = 8;
            }
        } else if (y > z) {
            d = y;
        } else {
            d = z;
        }
    }

    function f() public {
        if (x > y) {
            d = x;
            if (x > z) {
                // d = y > z ? 8 : z > 4 ? 5 : 6;
                if (z > 3) {
                    d = z;
                }
            }
        } else if (y > z) {
            d = y;
        } else {
            d = z;
        }

        if (x < y) d = 7;
    }

    function g() public view returns (uint256) {
        return x + y - z;
    }

    function h() public returns (uint256) {
        d = x > 5 ? y : z;
        return d;
    }

    function k() public view returns (uint256) {
        return x > 5 ? 5 : y > 2 ? 3 : 4;
    }
}
