// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.18;

abstract contract BaseSecretHolder {
    mapping(bytes32 => uint256) public commitments;

    event Open(bytes32 indexed commitID);
    event Close(bytes32 indexed commitID, bytes32 indexed secret);
    event Expire(bytes32 indexed commitID);

    receive() external payable {}

    /**
     * @dev Creates a new commitment.
     * @param commitID The commitment ID.
     * @param timelock The timelock indicating when the commitment will expire.
     */
    modifier commitment(bytes32 commitID, uint256 timelock) {
        require(commitments[commitID] == 0, "Commitment already exists.");
        require(
            timelock > block.timestamp,
            "Timelock value must be in the future."
        );
        _;
        commitments[commitID] = timelock;
        emit Open(commitID);
    }

    /**
     * @dev closes a commitment.
     * @param commitID The commitment ID.
     * @param secret The secret.
     */
    modifier secreatReveal(bytes32 commitID, bytes32 secret) {
        require(commitments[commitID] > 0, "Commitment does not exist.");
        uint256 timelock = commitments[commitID];
        delete commitments[commitID];
        require(timelock >= block.timestamp, "Commitment has expired.");
        require(commitmentFromSecret(secret) == commitID, "Invalid secret.");
        _;
        emit Close(commitID, secret);
    }

    /**
     * @dev Expires a commitment.
     * @param commitID The commitment ID.
     */
    modifier commitmentExpire(bytes32 commitID) {
        require(commitments[commitID] > 0, "Commitment does not exist.");
        uint256 timelock = commitments[commitID];
        delete commitments[commitID];
        require(timelock < block.timestamp, "Commitment has not expired.");
        _;
        emit Expire(commitID);
    }

    /**
     * @dev Returns the commitment ID from a given secret.
     * @param secret The secret.
     * @return The commitment ID.
     */
    function commitmentFromSecret(
        bytes32 secret
    ) public pure virtual returns (bytes32);
}
