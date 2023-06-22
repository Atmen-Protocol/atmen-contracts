// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.18;

import {ECCUtils} from "../lib/ECCUtils.sol";
import "./BaseSecretHolderAccount.sol";

abstract contract ECSecretHolder is BaseSecretHolderAccount {
    uint256 immutable m =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    /**
     * @dev Returns the address from a given commitment.
     * @param qx x-coordinate of the commitment.
     * @param qy y-coordinate of the commitment.
     * @return The address.
     */
    function commitmentToAddress(
        uint256 qx,
        uint256 qy
    ) internal pure returns (address) {
        address _addr = address(
            uint160(
                uint256(keccak256(abi.encodePacked(qx, qy))) &
                    0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
            )
        );
        return _addr;
    }

    /**
     * Calculates the commitment from an initial commitment and a shared secret.
     * This function should be used as a tool to calculate the mirror commitment.
     * @param qx x-coordinate of the initial commitment.
     * @param qy y-coordinate of the initial commitment.
     * @param sharedSecret that generates the commitment.
     * @return x- and y-coordinates of the new commitment.
     */
    function commitmentFromSharedSecret(
        uint256 qx,
        uint256 qy,
        bytes32 sharedSecret
    ) external pure returns (bytes32) {
        (uint256 _qx, uint256 _qy) = ECCUtils.ecmul(
            ECCUtils.gx,
            ECCUtils.gy,
            uint256(sharedSecret)
        );

        (uint256 _qsx, uint256 _qsy) = ECCUtils.ecadd(qx, qy, _qx, _qy);
        address _addr = commitmentToAddress(_qsx, _qsy);
        return bytes32(uint256(uint160(_addr)));
    }

    /**
     * @dev Returns the commitment ID from a given secret.
     * @param secret The secret.
     * @return The commitment ID.
     */
    function commitmentFromSecret(
        bytes32 secret
    ) public pure override returns (bytes32) {
        address _addr = ecrecover(
            0,
            ECCUtils.gy % 2 != 0 ? 28 : 27,
            bytes32(ECCUtils.gx),
            bytes32(mulmod(uint256(secret), ECCUtils.gx, m))
        );

        return bytes32(uint256(uint160(_addr)));
    }
}
