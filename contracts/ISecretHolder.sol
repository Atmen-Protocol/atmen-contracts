// SPDX-License-Identifier: GPL-3.0
// Atmen Protocol Contracts (last updated v0.1.0) (interfaces/ISecretHolder.sol)
pragma solidity ^0.8.18;

interface ISecretHolder {
    struct Commitment {
        uint256 timelock;
        bytes callbackData;
    }

    /**
     * @dev Returns the commitment ID from a given secret.
     * @param secret The secret.
     * @return The commitment ID.
     */
    function commitmentFromSecret(
        bytes32 secret
    ) external pure returns (bytes32);

    /**
     * @dev Creates a new commitment.
     * @param commitID The commitment ID.
     * @param timelock The timelock indicating when the commitment will expire.
     * @param callbackData The callback data used to trigger the callback when the secret is revealed.
     */
    function commit(
        bytes32 commitID,
        uint256 timelock,
        bytes calldata callbackData
    ) external payable;

    /**
     * @dev Reveals the secret associated with a given commitment.
     * @param commitID The commitment ID.
     * @param secret The secret.
     */
    function reveal(bytes32 commitID, bytes32 secret) external payable;

    /**
     * @dev Expires a commitment.
     * @param commitID The commitment ID.
     */
    function expire(bytes32 commitID) external;
}
