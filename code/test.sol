// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;

contract Test {
    uint256 x;
    uint256 y;
    uint256 z;

    constructor() {
        for (uint256 i = 0; i < 10; i++) {
            x = 5;
            y = 10;
            y = 10;
            y = 10;
            y = 10;
            for (uint256 j = 0; j < 10; j++) {
                x = 5;
                y = 10;
                y = 10;
                for (uint256 k = 0; k < 10; k++) {
                    y = 10;
                    y = 10;
                    y = 10;
                    y = 10;
                    if (x < 5) {
                        z = 4;
                        y = 10;
                    } else {
                        z = 5;
                    }
                }
            }
        }
    }
}
