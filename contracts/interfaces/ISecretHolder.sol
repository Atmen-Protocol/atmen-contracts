// SPDX-License-Identifier: GPL-3.0
// Atmen Protocol Contracts (last updated v0.1.0) (interfaces/ISecretHolder.sol)
pragma solidity ^0.8.18;

interface ISecretHolder {
    event Open(bytes32 indexed commitID);
    event Close(bytes32 indexed commitID, bytes32 indexed secret);
    event Expire(bytes32 indexed commitID);

    /**
     * @dev Returns the commitment ID from a given secret.
     * @param secret The secret.
     * @return The commitment ID.
     */
    function commitmentFromSecret(
        bytes32 secret
    ) external pure returns (bytes32);

    /**
     * @dev Reveals the secret associated with a given commitment.
     * This will eventually call _close or _expire.
     * @param commitID The commitment ID.
     * @param secret The secret.
     */
    function reveal(bytes32 commitID, bytes32 secret) external;
}
