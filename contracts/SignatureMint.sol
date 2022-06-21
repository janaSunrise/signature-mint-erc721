// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

abstract contract SignatureMint is EIP712 {
    /**
     * @dev Implementing the ECDSA algorithm for the `bytes32` type in order to
     * implement the `recover` function for it, which is used to recover the signer
     * address from the hashed voucher data.
     */
    using ECDSA for bytes32;

    /**
     * @dev Mapping to hold the state if token is minted. This is used to verify if a voucher
     * has been used or not.
     */
    mapping(bytes32 => bool) private minted;

    /// @dev Mint voucher struct.
    struct MintVoucher {
        bytes32 uuid;
        address to;
        string uri;
        uint256 price;
        address currency;
        address paymentReceiver;
    }

    /// @dev Mint voucher typehash, pre-computed to save gas.
    // keccak256("MintVoucher(bytes32 uuid,address to,string uri,uint256 price,address currency,address paymentReceiver)");
    bytes32 private constant TYPEHASH =
        0x06b649bcdba226195cba9cad54aac117855d46fb024cdfeb3f80b699d0ca5483;

    // solhint-disable-next-line no-empty-blocks
    constructor() EIP712("SignatureMintNFT", "1") {}

    /**
     * @dev Hash the typed data for the voucher supplied. This returns the hash of the encoded EIP712 message
     * for the specified domain, which in case is the voucher struct.
     */
    function _hash(MintVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        TYPEHASH,
                        voucher.uuid,
                        voucher.to,
                        keccak256(bytes(voucher.uri)),
                        voucher.price,
                        voucher.currency,
                        voucher.paymentReceiver
                    )
                )
            );
    }

    /**
     * @dev Verify if the voucher is valid, i.e. exists, and has not been used yet. Also
     * signatures are meant to be signed by valid signers, so this checks if it's not signed
     * by anyone, and only those who have the role to.
     */
    function verify(MintVoucher calldata voucher, bytes calldata signature)
        public
        view
        returns (bool success, address signer)
    {
        signer = _hash(voucher).recover(signature);
        success = !minted[voucher.uuid] && _isValidSigner(signer);
    }

    /**
     * @dev This function is to process voucher. This has internal check to ensure the voucher is not invalid,
     * If not, set the `minted` status to true, and finally returns the signer of the voucher.
     */
    function _processVoucher(
        MintVoucher calldata voucher,
        bytes calldata signature
    ) internal returns (address) {
        bool success;
        address signer;

        // Ensure not minted
        (success, signer) = verify(voucher, signature);
        require(success, "Invalid voucher");

        // Set minted, if valid and invalidate the voucher.
        minted[voucher.uuid] = true;

        return signer;
    }

    /// @dev Abstract function to check if the signer is a valid one for the signature.
    function _isValidSigner(address signer)
        internal
        view
        virtual
        returns (bool);
}
