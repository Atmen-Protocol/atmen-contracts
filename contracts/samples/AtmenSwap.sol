// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.18;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {UserOperationLib, UserOperation} from "@account-abstraction/contracts/interfaces/UserOperation.sol";
import {SecretHolderWallet} from "../core/SecretHolderWallet.sol";
import {ECCommitment} from "../lib/ECCommitment.sol";

using UserOperationLib for UserOperation;

contract AtmenSwap is SecretHolderWallet {
    struct Swap {
        address tokenContract;
        uint256 value;
        address payable sender;
        address payable recipient;
    }

    mapping(bytes32 => Swap) public swaps;

    address immutable ETH_TOKEN_CONTRACT = address(0x0);
    uint256 public immutable MAX_BUNDLER_EXTRA_TIP = 2;
    bytes4 public immutable REVEAL_SELECTOR = 0xfc334e8c; // == bytes4(keccak256("reveal(bytes32,bytes32)"));

    uint256 public immutable MINIMUM_SWAP_VALUE = 0.001 ether;
    uint256 private immutable USER_OP_MAX_GAS_COST = 50000;

    constructor(address _entryPoint) public SecretHolderWallet(_entryPoint) {}

    function openETHSwap(
        bytes32 commitID,
        uint256 timelock,
        address payable recipient
    ) public payable commitment(commitID, timelock) {
        require(msg.value > MINIMUM_SWAP_VALUE, "Invalid message value.");

        Swap memory swap = Swap({
            tokenContract: ETH_TOKEN_CONTRACT,
            value: msg.value,
            sender: payable(msg.sender),
            recipient: recipient
        });

        swaps[commitID] = swap;
    }

    function openERC20Swap(
        bytes32 commitID,
        uint256 timelock,
        address payable recipient,
        address tokenAddress,
        uint256 value
    ) public payable commitment(commitID, timelock) {
        require(
            tokenAddress != ETH_TOKEN_CONTRACT, //FIXME: should check if the address has an ERC20 interface. https://stackoverflow.com/questions/45364197/how-to-detect-if-an-ethereum-address-is-an-erc20-token-contract
            "The address is not a valid ERC20 token."
        );

        //We still require some native tokens to be sent to the contract to pay for the verification of the userOp
        require(msg.value > MINIMUM_SWAP_VALUE, "Invalid message value.");

        require(value > 0, "Value must be larger than 0.");

        // Transfer value from the ERC20 trader to this contract.
        // These checks are already implied in the ETH case.
        ERC20 erc20Contract = ERC20(tokenAddress);
        require(
            erc20Contract.allowance(msg.sender, address(this)) >= value,
            "Not enough balance."
        );
        require(
            erc20Contract.transferFrom(msg.sender, address(this), value),
            "Transfer failed."
        );

        Swap memory swap = Swap({
            tokenContract: tokenAddress,
            value: value,
            sender: payable(msg.sender),
            recipient: recipient
        });
        swaps[commitID] = swap;
    }

    /**
     * @dev Returns the commitment ID from a given secret.
     * @param secret The secret.
     * @return The commitment ID.
     */
    function commitmentFromSecret(
        bytes32 secret
    ) public pure override returns (bytes32) {
        return ECCommitment.commitmentFromSecret(secret);
    }

    /**
     * @dev Closes a commitment.
     * @param commitID The commitment ID.
     */
    function _onClose(bytes32 commitID) internal override {
        Swap memory swap = swaps[commitID];
        delete swaps[commitID];
        // Check if we are handling a user operation
        if (msg.sender == address(entryPoint())) {
            swap.value = swap.value - USER_OP_MAX_GAS_COST * tx.gasprice;
        }
        if (swap.tokenContract == ETH_TOKEN_CONTRACT) {
            // Transfer the ETH funds from this contract to the recipient.
            (bool sent, ) = swap.recipient.call{value: swap.value}("");
            require(sent, "Failed to send Ether");
        } else {
            // Transfer the ERC20 funds from this contract to the recipient.
            ERC20 erc20Contract = ERC20(swap.tokenContract);
            require(erc20Contract.transfer(swap.recipient, swap.value));
        }
    }

    /**
     * @dev Expires a commitment.
     * @param commitID The commitment ID.
     */
    function _onExpire(bytes32 commitID) internal override {
        Swap memory swap = swaps[commitID];
        delete swaps[commitID];
        // Check if we are handling a user operation
        if (msg.sender == address(entryPoint())) {
            swap.value = swap.value - USER_OP_MAX_GAS_COST * tx.gasprice;
        }
        if (swap.tokenContract == ETH_TOKEN_CONTRACT) {
            // Transfer the ETH funds from this contract to the sender.
            (bool sent, ) = swap.sender.call{value: swap.value}("");
            require(sent, "Failed to send Ether");
        } else {
            // Transfer the ERC20 funds from this contract to the sender.
            ERC20 erc20Contract = ERC20(swap.tokenContract);
            require(erc20Contract.transfer(swap.sender, swap.value));
        }
    }

    /**
     * @dev Closes a commitment with a user operation.
     * @param commitID The commitment ID.
     */
    function _onCloseWithUserOp(
        bytes32 commitID,
        uint256 gasprice
    ) internal override {
        Swap memory swap = swaps[commitID];
        delete swaps[commitID];
        // Transfer the ETH funds from this contract to the recipient.
        (bool sent, ) = swap.recipient.call{
            value: swap.value - USER_OP_MAX_GAS_COST * gasprice
        }("");
        require(sent, "Failed to send Ether");
    }

    /**
     * @dev Expires a commitment with a user operation.
     * @param commitID The commitment ID.
     */
    function _onExpireWithUserOp(
        bytes32 commitID,
        uint256 gasprice
    ) internal override {
        Swap memory swap = swaps[commitID];
        delete swaps[commitID];
        // Transfer the ETH funds from this contract to the sender.
        (bool sent, ) = swap.sender.call{
            value: swap.value - USER_OP_MAX_GAS_COST * gasprice
        }("");
        require(sent, "Failed to send Ether");
    }

    /**
     * validate the signature is valid for this message.
     * @param userOp validate the userOp.signature field
     * @param userOpHash convenient field: the hash of the request, to check the signature against
     *          (also hashes the entrypoint and chain id)
     * @return validationData signature and time-range of this operation
     *      <20-byte> sigAuthorizer - 0 for valid signature, 1 to mark signature failure,
     *         otherwise, an address of an "authorizer" contract.
     *      <6-byte> validUntil - last timestamp this operation is valid. 0 for "indefinite"
     *      <6-byte> validAfter - first timestamp this operation is valid
     *      If the account doesn't use time-range, it is enough to return SIG_VALIDATION_FAILED value (1) for signature failure.
     *      Note that the validation code cannot use block.timestamp (or block.number) directly.
     */
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        bytes32 _commitID = bytes32(userOp.callData[:32]);
        bytes32 _secret = bytes32(userOp.callData[32:64]);

        if (commitments[_commitID] == 0) {
            return SIG_VALIDATION_FAILED;
        }

        if (swaps[_commitID].tokenContract != ETH_TOKEN_CONTRACT) {
            return SIG_VALIDATION_FAILED;
        }

        if (commitmentFromSecret(_secret) != _commitID) {
            return SIG_VALIDATION_FAILED;
        }
        bytes4 _selector = bytes4(userOp.callData[64:68]);

        if (_selector != REVEAL_SELECTOR) {
            return SIG_VALIDATION_FAILED;
        }

        // Check that the bundler is not cheating in a larger fee in the userOp
        // we restate the following equations:
        //     minerTip = (tx.gasprice - block.basefee) / tx.gasprice
        //     bundlerTip = (userOp.maxPriorityFeePerGas - tx.gasprice) / userOp.maxPriorityFeePerGas
        // and check that bundlerTip <= MAX_BUNDLER_EXTRA_TIP * minerTip
        if (
            (userOp.maxPriorityFeePerGas - tx.gasprice) * tx.gasprice >
            MAX_BUNDLER_EXTRA_TIP *
                (tx.gasprice - block.basefee) *
                userOp.maxPriorityFeePerGas
        ) {
            //in principle this is unsafe math
            return SIG_VALIDATION_FAILED;
        }
        uint256 _gasPrice = uint256(bytes32(userOp.callData[68:100]));
        if (_gasPrice > userOp.gasPrice()) {
            return SIG_VALIDATION_FAILED;
        }
        return 0;
    }
}
