// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BuiltinsTwo {
    event Done(bytes data);

    function encoders(
        bytes memory p
    )
        public
        view
        returns (
            bytes memory a,
            bytes memory b,
            bytes memory c,
            bytes memory d,
            bytes memory e,
            bytes memory bc,
            string memory sc
        )
    {
        a = abi.encode(uint(1), address(this)); // 2-calls
        b = abi.encodePacked(bytes1(0x01), p); // 2-calls
        c = abi.encodeWithSelector(this.emitIt.selector, p); // 2-calls
        d = abi.encodeWithSignature("emitIt(bytes)", p); // 2-calls
        e = abi.encodeCall(this.emitIt, (p)); // 3-calls (encode is 2 and `this.emitIt` is 1)

        bc = bytes.concat(a, b, c, d, e); // 2-calls
        sc = string.concat("a", "b"); // 2-calls
    }

    function move(address payable to) public payable {
        to.transfer(1 wei); // 2-calls
        bool ok = to.send(1 wei); // 2-calls
        ok; // silence warning
    }

    function emitIt(bytes calldata data) external {
        emit Done(data);
    }

    receive() external payable {}
}
