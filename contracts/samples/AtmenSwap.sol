// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.18;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {UserOperationLib, UserOperation} from "@account-abstraction/contracts/interfaces/UserOperation.sol";
import {ECSecretHolder} from "../core/ECSecretHolder.sol";
import {BaseSecretHolderAccount} from "../core/BaseSecretHolderAccount.sol";

using UserOperationLib for UserOperation;

contract AtmenSwap is ECSecretHolder {
    struct Swap {
        address tokenContract;
        uint256 value;
        address payable sender;
        address payable recipient;
    }

    mapping(bytes32 => Swap) public swaps;

    address immutable ETH_TOKEN_CONTRACT = address(0x0);
    bytes4 public immutable REVEAL_SELECTOR = 0xfc334e8c; // == bytes4(keccak256("reveal(bytes32,bytes32)"));

    uint256 public immutable MINIMUM_SWAP_VALUE = 0.001 ether;
    uint256 public immutable MAX_USER_OP_GAS_PRICE = 30;

    constructor(
        address _entryPoint
    ) public BaseSecretHolderAccount(_entryPoint) {}

    function openETHSwap(
        bytes32 commitID,
        uint256 timelock,
        address payable recipient
    ) public payable commitment(commitID, timelock) {
        // The swapID is used also as commitment
        // require(swaps[swapID].value == 0, "Swap has been already opened.");//already checked in modifier
        // require(
        //     _timelock > block.timestamp,
        //     "Timelock value must be in the future."
        // );
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
        address payable recipient,
        uint256 timelock,
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
     * @dev Closes a commitment.
     * @param commitID The commitment ID.
     */
    function _close(bytes32 commitID) internal override {
        Swap memory swap = swaps[commitID];
        delete swaps[commitID];
        if (swap.tokenContract == ETH_TOKEN_CONTRACT) {
            // Transfer the ETH funds from this contract to the recipient.
            (bool sent, ) = swap.recipient.call{
                value: swap.value - MAX_USER_OP_GAS_PRICE
            }("");
            require(sent, "Failed to send Ether");
        } else {
            require(msg.value >= 0, "Insufficient fee.");
            // Transfer the ERC20 funds from this contract to the recipient.
            ERC20 erc20Contract = ERC20(swap.tokenContract);
            require(erc20Contract.transfer(swap.recipient, swap.value));
        }
    }

    /**
     * @dev Expires a commitment.
     * @param commitID The commitment ID.
     */
    function _expire(bytes32 commitID) internal override {
        Swap memory swap = swaps[commitID];
        delete swaps[commitID];
        if (swap.tokenContract == ETH_TOKEN_CONTRACT) {
            // Transfer the ETH funds from this contract to the sender.
            (bool sent, ) = swap.sender.call{
                value: swap.value - MAX_USER_OP_GAS_PRICE
            }("");
            require(sent, "Failed to send Ether");
        } else {
            // Transfer the ERC20 funds from this contract to the sender.
            ERC20 erc20Contract = ERC20(swap.tokenContract);
            require(erc20Contract.transfer(swap.sender, swap.value));
        }
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
        super._validateSignature(userOp, userOpHash);
        bytes4 _selector = bytes4(userOp.callData[64:68]);

        if (_selector != REVEAL_SELECTOR) {
            return SIG_VALIDATION_FAILED;
        }

        // Check that the bundler is not cheating in a larger fee in the userOp
        uint256 gasPrice = userOp.gasPrice();
        require(gasPrice <= tx.gasprice, "Gas price too high");

        return 0;
    }
}
