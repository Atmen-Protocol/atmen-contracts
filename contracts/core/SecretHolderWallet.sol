// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.18;

import "./BaseSecretHolder.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";

abstract contract SecretHolderWallet is BaseSecretHolder, BaseAccount {
    IEntryPoint private immutable _entryPoint;

    constructor(address __entryPoint) {
        _entryPoint = IEntryPoint(__entryPoint);
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * @dev Either closes or expires a commitment, depending on the block timestamp.
     * This function can be called only by the entry point, i.e. only as the target of a user operation.
     * The secret verification is skipped as it was already verified in the _verifySignature function.
     * @param commitID The commitment ID.
     * @param secret The secret.
     */
    function reveal(bytes32 commitID, bytes32 secret, uint256 gasprice) public {
        _requireFromEntryPoint();
        require(commitments[commitID] > 0, "commitment does not exist");
        uint256 timelock = commitments[commitID];
        delete commitments[commitID];
        if (timelock > block.timestamp) {
            _onCloseWithUserOp(commitID, gasprice);
            emit Close(commitID, secret);
        } else {
            _onExpireWithUserOp(commitID, gasprice);
            emit Expire(commitID);
        }
    }

    function validateSignature_test(
        UserOperation calldata userOp
    ) public view returns (bool) {
        return _validateSignature(userOp, 0) == 0;
    }

    /**
     * @dev closes a commitment.
     * @param commitID The commitment ID.
     * @param secret The secret.
     */
    function close(
        bytes32 commitID,
        bytes32 secret
    ) public secreatReveal(commitID, secret) {
        _onClose(commitID);
    }

    /**
     * @dev Expires a commitment.
     * @param commitID The commitment ID.
     */
    function expire(bytes32 commitID) public commitmentExpire(commitID) {
        _onExpire(commitID);
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

    /**
     * @dev Run custom logic when closing.
     * @param commitID The commitment ID.
     */
    function _onClose(bytes32 commitID) internal virtual;

    /**
     * @dev Run custom logic when expiring.
     * @param commitID The commitment ID.
     */
    function _onExpire(bytes32 commitID) internal virtual;

    /**
     * @dev Run custom logic when closing with user operation.
     * @param commitID The commitment ID.
     */
    function _onCloseWithUserOp(
        bytes32 commitID,
        uint256 gasprice
    ) internal virtual;

    /**
     * @dev Run custom logic when expiring with user operation.
     * @param commitID The commitment ID.
     */
    function _onExpireWithUserOp(
        bytes32 commitID,
        uint256 gasprice
    ) internal virtual;
}
