// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Test {
    uint256 x = 5;
    uint256 y = 4;
    uint256 z = 3;
    uint256 d;

    constructor() {
        d = y > z ? z < 4 ? 5 : 7 : z > 4 ? 5 : 6;
        if (x > y) {
            d = x;
            require(x >= 5, "error");

            if (x > z) {
                require(x >= 5, "error");
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
                require(x >= 5, "error");

                d = y > z ? 8 : z > 4 ? 5 : 6;
                if (z > 3) {
                    assert(x >= 5);
                    d = z;
                    if (z > 2) {
                        require(z >= 2);
                    }
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
        return y > z ? z < 4 ? 5 : 7 : z > 4 ? 5 : 6;
    }
}
