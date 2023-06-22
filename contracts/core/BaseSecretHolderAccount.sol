// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.18;

import "./BaseSecretHolder.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";

abstract contract BaseSecretHolderAccount is BaseSecretHolder, BaseAccount {
    IEntryPoint private immutable _entryPoint;

    constructor(address __entryPoint) {
        _entryPoint = IEntryPoint(__entryPoint);
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * @dev Creates a new commitment.
     * @param commitID The commitment ID.
     * @param secret The secret.
     */
    function reveal(bytes32 commitID, bytes32 secret) public override {
        require(commitments[commitID] > 0, "commitment does not exist");
        uint256 timelock = commitments[commitID];
        delete commitments[commitID];
        if (timelock > block.timestamp) {
            if (msg.sender != address(entryPoint())) {
                require(
                    commitmentFromSecret(secret) == commitID,
                    "invalid secret"
                );
            }
            _close(commitID);
            emit Close(commitID, secret);
        } else {
            _expire(commitID);
            emit Expire(commitID);
        }
    }

    /// @inheritdoc BaseAccount
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32
    ) internal view virtual override returns (uint256 validationData) {
        bytes32 _commitID = bytes32(userOp.callData[:32]);
        bytes32 _secret = bytes32(userOp.callData[32:64]);

        if (commitments[_commitID] == 0) {
            return SIG_VALIDATION_FAILED;
        }

        if (commitmentFromSecret(_secret) != _commitID) {
            return SIG_VALIDATION_FAILED;
        }
        return 0;
    }

    function validateSignature_test(
        UserOperation calldata userOp
    ) public view returns (bool) {
        return _validateSignature(userOp, 0) == 0;
    }
}
