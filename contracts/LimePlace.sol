// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TokenList.sol";

contract LimePlace is ReentrancyGuard {
    using Counters for Counters.Counter;
    using TokenList for TokenList.List;
    
    Counters.Counter private _nftsSold;
    Counters.Counter private _nftCount;

    uint256 public LISTING_FEE = 100000000000000 wei;
    address payable private _marketOwner;
    mapping(uint256 => Listing) public _listings;
    
    //keep track of listings
    TokenList.List private _activeListings;
    mapping(address => TokenList.List) private _userListings;
    mapping(address => TokenList.List) private _userTokens;
    mapping(address => TokenList.List) private _collectionListings;

    struct Listing {
        address nftContract;
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool listed;
    }
    event NFTListed(
        address nftContract,
        uint256 tokenId,
        address seller,
        address owner,
        uint256 price
    );
    event NFTSold(
        address nftContract,
        uint256 tokenId,
        address seller,
        address owner,
        uint256 price
    );

    constructor() {
        _marketOwner = payable(msg.sender);
    }

    // List the NFT on the marketplace
    function listNft(address _nftContract, uint256 _tokenId, uint256 _price) public payable nonReentrant {
        require(_price > 0, "Price must be at least 1 wei");
        require(msg.value == LISTING_FEE, "Not enough ether for listing fee");
        
        //check if token is supporting erc721
        require(IERC721(_nftContract).supportsInterface(0x80ac58cd), "This marketplace support only ERC721 tokens");
        require(IERC721(_nftContract).getApproved(_tokenId) == address(this), "LimePlace should be approved for operator");
        //IERC721(_nftContract).transferFrom(msg.sender, address(this), _tokenId);
        _marketOwner.transfer(LISTING_FEE);
        uint256 tokenId = _nftCount.current();
        //create listing
        _listings[tokenId] = Listing(
            _nftContract,
            _tokenId,
            payable(msg.sender),
            payable(address(this)),
            _price,
            true
        );
        //add listing to active lists
        _activeListings.safeAddToken(tokenId);
        _userListings[msg.sender].safeAddToken(tokenId);
        _userTokens[msg.sender].safeAddToken(tokenId);
        _collectionListings[_nftContract].safeAddToken(tokenId);
        
        _nftCount.increment();
        emit NFTListed(_nftContract, _tokenId, msg.sender, address(this), _price);
    }

    // Buy an NFT
    function buyNft(uint256 _tokenId) public payable nonReentrant {
        Listing storage nft = _listings[_tokenId];
        require(msg.value >= nft.price, "Not enough ether to cover asking price");
        
        address payable buyer = payable(msg.sender);
        address payable seller = payable(nft.seller);
        seller.transfer(msg.value);
        IERC721(nft.nftContract).transferFrom(seller, buyer, nft.tokenId);
        nft.owner = buyer;
        nft.listed = false;

        //remove listing from active lists
        _activeListings.safeRemoveToken(_tokenId);
        _userListings[seller].safeRemoveToken(_tokenId);
        _userTokens[seller].safeRemoveToken(_tokenId);
        _userTokens[buyer].safeAddToken(_tokenId);
        _collectionListings[nft.nftContract].safeRemoveToken(_tokenId);
        
        _nftsSold.increment();
        emit NFTSold(nft.nftContract, nft.tokenId, nft.seller, buyer, msg.value);
    }

    //todo modify listing function in order to have resell in it!!!
    // Resell an NFT purchased from the marketplace
//    function resellNft(address _nftContract, uint256 _tokenId, uint256 _price) public payable nonReentrant {
//        require(_price > 0, "Price must be at least 1 wei");
//        require(msg.value == LISTING_FEE, "Not enough ether for listing fee");
//
//        IERC721(_nftContract).transferFrom(msg.sender, address(this), _tokenId);
//
//        Listing storage nft = _listings[_tokenId];
//        nft.seller = payable(msg.sender);
//        nft.owner = payable(address(this));
//        nft.listed = true;
//        nft.price = _price;
//
//        _nftsSold.decrement();
//        emit NFTListed(_nftContract, _tokenId, msg.sender, address(this), _price);
//    }

    
    function getListedNfts() public view returns (uint256[] memory) {
        return _activeListings.getList();
    }
    
    function getNftsByUser(address _user) public view returns (uint256[] memory) {
        return _userTokens[_user].getList();
    }

    function getListedNftsByUser(address _user) public view returns (uint256[] memory) {
        return _userListings[_user].getList();
    }
}
