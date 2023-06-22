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
        require(commitments[commitID] == 0, "commitment already exists");
        require(timelock > block.timestamp, "timelock must be in the future");
        _;
        commitments[commitID] = timelock;
        emit Open(commitID);
    }

    /**
     * @dev Returns the commitment ID from a given secret.
     * @param secret The secret.
     * @return The commitment ID.
     */
    function commitmentFromSecret(
        bytes32 secret
    ) public pure virtual returns (bytes32);

    /**
     * @dev Creates a new commitment.
     * @param commitID The commitment ID.
     * @param secret The secret.
     */
    function reveal(bytes32 commitID, bytes32 secret) public virtual {
        require(commitments[commitID] > 0, "commitment does not exist");
        uint256 timelock = commitments[commitID];
        delete commitments[commitID];
        if (timelock > block.timestamp) {
            require(commitmentFromSecret(secret) == commitID, "invalid secret");
            _close(commitID);
            emit Close(commitID, secret);
        } else {
            _expire(commitID);
            emit Expire(commitID);
        }
    }

    /**
     * @dev Run custom logic when closing.
     * @param commitID The commitment ID.
     */
    function _close(bytes32 commitID) internal virtual;

    /**
     * @dev Run custom logic when expiring.
     * @param commitID The commitment ID.
     */
    function _expire(bytes32 commitID) internal virtual;
}
