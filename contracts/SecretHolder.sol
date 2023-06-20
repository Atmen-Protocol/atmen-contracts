// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.18;

import "./ISecretHolder.sol";
import {ECCUtils} from "./ECCUtils.sol";

contract ECCSecretHolder is ISecretHolder {
    mapping(bytes32 => Commitment) public commitments;

    event Open(bytes32 indexed commitID);
    event Close(bytes32 indexed commitID, bytes32 indexed secret);
    event Expire(bytes32 indexed commitID);

    receive() external payable {}

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
     * @param commitID The commitment ID.
     * @param secret The secret.
     */
    function reveal(bytes32 commitID, bytes32 secret) external payable;

    /**
     * @dev Expires a commitment.
     * @param commitID The commitment ID.
     */
    function expire(bytes32 commitID) external;

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
    ) external payable {
        require(commitments[commitID].timelock == 0, "Commitment exists.");
        commitments[commitID].timelock = _timelock;
        commitments[commitID].callbackData = _calldata;
    }

    /**
     * Calculates the commitment from a secret key.
     * The commitment is a point on the curve.
     * @param _secretKey that generates the commitment.
     * @return x- and y-coordinates of the commitment.
     */
    function commitmentFromSecret(
        uint256 _secretKey
    ) public pure returns (uint256, uint256) {
        return ECCUtils.ecmul(G_X, G_Y, _secretKey);
    }

    /**
     * Calculates the commitment from an initial commitment and a shared secret.
     * @param _qx x-coordinate of the initial commitment.
     * @param _qy y-coordinate of the initial commitment.
     * @param _sharedSecret that generates the commitment.
     * @return x- and y-coordinates of the new commitment.
     */
    function commitmentFromSharedSecret(
        uint256 _qx,
        uint256 _qy,
        uint256 _sharedSecret
    ) public pure returns (uint256, uint256) {
        (uint256 _qsx, uint256 _qsy) = commitmentFromSecret(_sharedSecret);
        return ECCUtils.ecadd(_qx, _qy, _qsx, _qsy);
    }

    function getHashedCommitment(
        uint256 _secretKey
    ) public pure returns (address) {
        address signer = ecrecover(
            0,
            G_Y_PARITY,
            bytes32(G_X),
            bytes32(mulmod(_secretKey, G_X, N))
        );

        return signer;
    }

    function commitmentToAddress(
        uint256 _qx,
        uint256 _qy
    ) public pure returns (address) {
        address _addr = address(
            uint160(
                uint256(keccak256(abi.encodePacked(_qx, _qy))) &
                    0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
            )
        );
        return _addr;
    }

    function openETHSwap(
        address _swapID,
        address payable _recipient,
        uint256 _timelock
    ) public payable {
        // The swapID is used also as commitment
        // address _swapID = commitmentToAddress(_qx, _qy);
        require(swaps[_swapID].value == 0, "Swap has been already opened.");
        require(
            _timelock > block.timestamp,
            "Timelock value must be in the future."
        );
        require(msg.value > MINIMUM_SWAP_VALUE, "Invalid message value.");

        Swap memory swap = Swap({
            timelock: _timelock,
            tokenContract: ETH_TOKEN_CONTRACT,
            value: msg.value,
            sender: payable(msg.sender),
            recipient: _recipient
        });

        swaps[_swapID] = swap;

        emit Open(_swapID);
    }

    function openERC20Swap(
        address _swapID,
        address payable _recipient,
        uint256 _timelock,
        address _tokenAddress,
        uint256 _value
    ) public payable {
        // address _swapID = commitmentToAddress(_qx, _qy);
        // The swapID is used also as commitment
        require(swaps[_swapID].value == 0, "Swap has been already opened.");
        require(
            _timelock > block.timestamp,
            "Timelock value must be in the future."
        );
        require(
            _tokenAddress != ETH_TOKEN_CONTRACT,
            "The address is not a valid ERC20 token."
        );
        require(
            msg.value == 0,
            "Cannot send ETH when swapping an ERC20 token."
        );

        require(_value > 0, "Value must be larger than 0.");

        // Transfer value from the ERC20 trader to this contract.
        // These checks are already implied in the ETH case.
        ERC20 erc20Contract = ERC20(_tokenAddress);
        require(
            erc20Contract.allowance(msg.sender, address(this)) >= _value,
            "Not enough balance."
        );
        require(
            erc20Contract.transferFrom(msg.sender, address(this), _value),
            "Transfer failed."
        );

        Swap memory swap = Swap({
            timelock: _timelock,
            tokenContract: _tokenAddress,
            value: _value,
            sender: payable(msg.sender),
            recipient: _recipient
        });
        swaps[_swapID] = swap;

        emit Open(_swapID);
    }

    function closeSwap(address _swapID, uint256 _secretKey) public payable {
        require(swaps[_swapID].value > 0, "Swap has not been opened.");

        if (swaps[_swapID].timelock > block.timestamp) {
            // require(_swapID == sha256(_secretKey)); This is the usual HTLC way.
            // Instead we use Schnorr-ish verification;
            // Note: _swapID is actually the hashed commitment
            require(
                getHashedCommitment(_secretKey) == _swapID,
                "Verification failed."
            );
            _closeSwap(_swapID, _secretKey);
        } else {
            _redeemSwap(_swapID);
        }
    }

    function _closeSwap(address _swapID, uint256 _secretKey) private {
        Swap memory swap = swaps[_swapID];
        delete swaps[_swapID];
        if (swap.tokenContract == ETH_TOKEN_CONTRACT) {
            // Transfer the ETH funds from this contract to the recipient.
            (bool sent, bytes memory data) = swap.recipient.call{
                value: swap.value
            }("");
        } else {
            require(msg.value >= 0, "Insufficient fee.");
            // Transfer the ERC20 funds from this contract to the recipient.
            ERC20 erc20Contract = ERC20(swap.tokenContract);
            require(erc20Contract.transfer(swap.recipient, swap.value));
        }

        emit Close(_swapID, _secretKey);
    }

    function _redeemSwap(address _swapID) private {
        Swap memory swap = swaps[_swapID];
        delete swaps[_swapID];
        if (swap.tokenContract == ETH_TOKEN_CONTRACT) {
            // Transfer the ETH funds from this contract to the sender.
            (bool sent, bytes memory data) = swap.sender.call{
                value: swap.value
            }("");
        } else {
            // Transfer the ERC20 funds from this contract to the sender.
            ERC20 erc20Contract = ERC20(swap.tokenContract);
            require(erc20Contract.transfer(swap.sender, swap.value));
        }

        emit Expire(_swapID);
    }

    function closeNoVerify(
        address _swapID,
        uint256 _secretKey,
        uint256 _requiredPrefund
    ) public {
        _requireFromEntryPoint();
        if (swaps[_swapID].timelock > block.timestamp) {
            _closeSwap(_swapID, _secretKey);
        } else {
            _redeemSwap(_swapID);
        }
    }

    // This is implemented by the entry point contract
    function _getRequiredPrefund(
        MemoryUserOp memory mUserOp
    ) internal pure returns (uint256 requiredPrefund) {
        unchecked {
            uint256 requiredGas = mUserOp.callGasLimit +
                mUserOp.verificationGasLimit +
                mUserOp.preVerificationGas;

            requiredPrefund = requiredGas * mUserOp.maxFeePerGas;
        }
    }

    /// implement template method of BaseAccount
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32
    ) internal virtual override returns (uint256 validationData) {
        bytes4 _selector = bytes4(userOp.callData[:4]);
        address _swapID = address(
            uint160(uint256(bytes32(userOp.callData[4:36])))
        );
        uint256 _secretKey = uint256(bytes32(userOp.callData[36:68]));
        uint256 _requiredPrefund = uint256(bytes32(userOp.callData[68:100]));

        if (_selector != CLOSE_NO_VERIFY_SELECTOR) {
            return SIG_VALIDATION_FAILED;
        }

        Swap memory swap = swaps[_swapID];

        if (swaps[_swapID].value == 0) {
            return SIG_VALIDATION_FAILED;
        }

        if (swap.tokenContract != ETH_TOKEN_CONTRACT) {
            return SIG_VALIDATION_FAILED;
        }

        //add verification fore required prefund
        MemoryUserOp memory mUserOp = MemoryUserOp(
            userOp.sender,
            userOp.nonce,
            userOp.callGasLimit,
            userOp.verificationGasLimit,
            userOp.preVerificationGas,
            address(0),
            userOp.maxFeePerGas,
            userOp.maxPriorityFeePerGas
        );
        if (_requiredPrefund < _getRequiredPrefund(mUserOp)) {
            return SIG_VALIDATION_FAILED;
        }

        if (getHashedCommitment(_secretKey) != _swapID) {
            return SIG_VALIDATION_FAILED;
        }
        return 0;
    }

    function validateSignature_test(UserOperation calldata userOp) public view {
        bytes4 _selector = bytes4(userOp.callData[:4]);
        address _swapID = address(
            uint160(uint256(bytes32(userOp.callData[4:36])))
        );
        uint256 _secretKey = uint256(bytes32(userOp.callData[36:68]));
        uint256 _requiredPrefund = uint256(bytes32(userOp.callData[68:100]));

        require(_selector == CLOSE_NO_VERIFY_SELECTOR, "Invalid selector.");

        Swap memory swap = swaps[_swapID];

        require(swap.value > 0, "Swap has not been opened.");

        require(
            swap.tokenContract == ETH_TOKEN_CONTRACT,
            "Token contract is not ETH."
        );

        //add verification for required prefund
        MemoryUserOp memory mUserOp = MemoryUserOp(
            userOp.sender,
            userOp.nonce,
            userOp.callGasLimit,
            userOp.verificationGasLimit,
            userOp.preVerificationGas,
            address(0),
            userOp.maxFeePerGas,
            userOp.maxPriorityFeePerGas
        );
        require(
            _requiredPrefund >= _getRequiredPrefund(mUserOp),
            "Insufficient prefund."
        );

        require(
            getHashedCommitment(_secretKey) == _swapID,
            "Verification failed."
        );
    }
}
