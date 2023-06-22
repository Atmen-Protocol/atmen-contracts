// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.18;

import "./BaseSecretHolderAccount.sol";

abstract contract HashSecretHolder is BaseSecretHolderAccount {
    /**
     * @dev Returns the commitment ID from a given secret.
     * @param secret The secret.
     * @return The commitment ID.
     */
    function commitmentFromSecret(
        bytes32 secret
    ) public pure virtual override returns (bytes32) {
        return keccak256(abi.encodePacked(secret));
    }
}
