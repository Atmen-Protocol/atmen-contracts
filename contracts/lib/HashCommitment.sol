// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.18;

library HashCommitment {
    /**
     * @dev Returns the commitment ID from a given secret.
     * @param secret The secret.
     * @return The commitment ID.
     */
    function commitmentFromSecret(
        bytes32 secret
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(secret));
    }
}
