// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    struct Listing {
        address seller;
        uint256 price;
        bool isActive;
    }

    mapping(uint256 => Listing) public listings;
    
    event NFTListed(uint256 indexed tokenId, address seller, uint256 price);
    event NFTSold(uint256 indexed tokenId, address seller, address buyer, uint256 price);
    event ListingCanceled(uint256 indexed tokenId, address seller);
    

    constructor() ERC721("NFTMarketplace", "NFTM") Ownable(msg.sender) {}

    // custom errors
    error UnAuthorized();
    error InvalidAmout();
    error NFTAlreadyListed();
    error IneligibleSeller();
    error InactiveListing();
    error InsufficientPayment();
    error NoFunds();


    function mint(string memory tokenURI) public returns (uint256) {
        _tokenIds += 1;
        uint256 newTokenId = _tokenIds;
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        return newTokenId;
    }

    function listNFT(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, UnAuthorized());
        require(price > 0, InvalidAmout());
        require(!listings[tokenId].isActive, NFTAlreadyListed());

        approve(address(this), tokenId);
        
        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isActive: true
        });

        emit NFTListed(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) public {
        Listing memory listing = listings[tokenId];
        require(listing.seller == msg.sender, IneligibleSeller());
        require(listing.isActive, InactiveListing());

        delete listings[tokenId];

        emit ListingCanceled(tokenId, msg.sender);
    }

    function buyNFT(uint256 tokenId) public payable {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, InactiveListing());
        require(msg.value >= listing.price, InsufficientPayment());

        address seller = listing.seller;
        uint256 price = listing.price;

        delete listings[tokenId];

        _transfer(seller, msg.sender, tokenId);
        payable(seller).transfer(price);

        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit NFTSold(tokenId, seller, msg.sender, price);
    }

    function withdrawFunds() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, NoFunds());
        payable(owner()).transfer(balance);
    }

    // Override the transferFrom function to remove listings when NFTs are transferred
    function transferFrom(address from, address to, uint256 tokenId) public virtual override(ERC721, IERC721) {
        super.transferFrom(from, to, tokenId);
        if (listings[tokenId].isActive) {
            delete listings[tokenId];
        }
    }

    // Override the safeTransferFrom function to remove listings when NFTs are transferred
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public virtual override(ERC721, IERC721) {
        super.safeTransferFrom(from, to, tokenId, data);
        if (listings[tokenId].isActive) {
            delete listings[tokenId];
        }
    }
}