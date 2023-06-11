// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./TokenList.sol";

contract LimePlace {
    using TokenList for TokenList.List;

    uint256 public LISTING_FEE = 100000000000000 wei;
    address payable private _marketOwner;
    mapping(bytes32 => Listing) private _listings;
    
    //keep track of active listings
    TokenList.List private _activeListings;

    struct Listing {
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        bool listed;
    }
    
    event LogListingAdded(bytes32 listingId, address nftContract, uint256 nftId, address seller, uint256 price);
    event LogListingUpdated(bytes32 listingId, address nftContract, uint256 nftId, address seller, uint256 price, bool active);
    event LogListingSold(bytes32 listingId, address nftContract, uint256 nftId, address seller, address owner, uint256 price);

    constructor() {
        _marketOwner = payable(msg.sender);
    }

    // List the NFT on the marketplace
    function list(address _nftContract, uint256 _tokenId, uint256 _price) public payable {
        require(_price > 0, "Price must be at least 1 wei");
        require(msg.value == LISTING_FEE, "Not enough ether for listing fee");
        
        //check if token is supporting erc721
        require(IERC721(_nftContract).supportsInterface(0x80ac58cd), "This marketplace support only ERC721 tokens");
        require(IERC721(_nftContract).getApproved(_tokenId) == address(this), "LimePlace should be approved for operator");
        _marketOwner.transfer(LISTING_FEE);
        bytes32 listingId = generateListingId(_nftContract, _tokenId);
        
        //check for existing _listings
        if(_listings[listingId].nftContract == address(0)) {
            //create listing
            _listings[listingId] = Listing(
                _nftContract,
                _tokenId,
                payable(msg.sender),
                _price,
                true
            );
        } else {
            _listings[listingId].seller = payable(msg.sender);
            _listings[listingId].price = _price;
            _listings[listingId].listed = true;
        }
        
        //add listing to active lists
        _activeListings.safeAddToken(listingId);
        
        emit LogListingAdded(listingId, _nftContract, _tokenId, msg.sender, _price);
    }
    
    //edit is used for edit price or cancel listing
    function editListing(bytes32 _listingId, uint256 _price, bool _listed) public {
        Listing storage nft = _listings[_listingId];
        require(msg.sender == nft.seller, "You can edit only your NFTs!");
        //edit price
        nft.price = _price;
        //cancel listing
        if(_listed == false) {
            nft.listed = _listed;
            _activeListings.safeRemoveToken(_listingId);
        }
        
        emit LogListingUpdated(_listingId, nft.nftContract, nft.tokenId, msg.sender, _price, _listed);
    }

    // Buy an NFT
    function buy(bytes32 _listingId) public payable {
        Listing storage nft = _listings[_listingId];
        require(msg.value >= nft.price, "Not enough ether to cover asking price");
        
        address payable buyer = payable(msg.sender);
        address payable seller = payable(nft.seller);
        seller.transfer(msg.value);
        IERC721(nft.nftContract).transferFrom(seller, buyer, nft.tokenId);
        nft.listed = false;

        //remove listing from active lists
        _activeListings.safeRemoveToken(_listingId);
        
        emit LogListingSold(_listingId, nft.nftContract, nft.tokenId, nft.seller, buyer, msg.value);
    }
    
    function getListedNfts() public view returns (bytes32[] memory) {
        return _activeListings.getList();
    }
    
    function getListing(bytes32 _listingId) public view returns (Listing memory) {
        return _listings[_listingId];
    }
    
    function generateListingId(address _contractAddress, uint256 _tokenId) public pure returns(bytes32) {
        return keccak256(abi.encode(_contractAddress, _tokenId));
    }
}
