// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./SignatureMint.sol";

contract NFT is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ERC721Burnable,
    SignatureMint,
    ReentrancyGuard,
    AccessControlEnumerable,
    Multicall
{
    using Counters for Counters.Counter;

    // Roles for the contract
    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 private constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    /// @dev Counter for the number of tokens minted.
    Counters.Counter private _tokenIdCounter;

    /// @dev The native token for the chain.
    address private constant NATIVE_TOKEN =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(TRANSFER_ROLE, msg.sender);
        _setupRole(TRANSFER_ROLE, address(0));
    }

    /// @dev Get the base URI for the contract.
    function _baseURI() internal pure override returns (string memory) {
        return "";
    }

    /// @dev Get the next tokenId to mint (for signature minting).
    function nextTokenId() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /// @dev Mint a single NFT with the `uri` containing the NFT metadata.
    function safeMint(address to, string memory uri)
        public
        onlyRole(MINTER_ROLE)
    {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    /// @dev Signature minting for NFTs.
    function signatureMint(
        MintVoucher calldata voucher,
        bytes calldata signature
    ) external payable nonReentrant returns (uint256) {
        // Verify voucher
        _processVoucher(voucher, signature);

        // If the receiver is `0x0`, send it to the signer.
        address to = voucher.to == address(0) ? msg.sender : voucher.to;

        // Collect payment and send it to the receiver.
        _processPayment(voucher);

        // Ensure tokenId is sequential.
        require(
            voucher.tokenId == _tokenIdCounter.current(),
            "voucher tokenId not sequential"
        );

        // Mint using `_mint` the normal way.
        _mint(to, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.uri);

        // Increment the tokenId counter -- The tokenId in the voucher is set automatically in SDK.
        _tokenIdCounter.increment();

        // Return the minted tokenId.
        return voucher.tokenId;
    }

    /// @dev Function to process payment for the signature minting.
    function _processPayment(MintVoucher calldata voucher) internal {
        uint256 price = voucher.price;
        address currency = voucher.currency;
        address paymentReceiver = voucher.paymentReceiver;

        // Ensure price is not zero.
        if (price == 0) {
            return;
        }

        // If the currency specified is the native chain token.
        if (currency == NATIVE_TOKEN) {
            require(msg.value == price, "correct price not sent");

            (bool success, ) = voucher.paymentReceiver.call{value: price}("");

            require(success, "payment receiver failed");
        } else {
            if (msg.sender == paymentReceiver) {
                return;
            }

            IERC20(voucher.currency).transferFrom(
                msg.sender,
                paymentReceiver,
                price
            );
        }
    }

    // The following functions are overrides required by Solidity.
    function _isValidSigner(address signer)
        internal
        view
        virtual
        override
        returns (bool)
    {
        return hasRole(MINTER_ROLE, signer);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);

        // Check if transfer is restricted on the contract.
        if (
            from != address(0) &&
            to != address(0) &&
            !hasRole(TRANSFER_ROLE, address(0))
        ) {
            require(
                hasRole(TRANSFER_ROLE, from) || hasRole(TRANSFER_ROLE, to),
                "only transfer role holders can transfer"
            );
        }
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControlEnumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
