// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import './LimePlaceNFT.sol';

contract LimePlace is Ownable {
    using ERC165Checker for address;
    uint256 public LISTING_FEE = 100000000000000 wei;
    uint256 private _pendingFees;
    uint256 private _fees;
    
    mapping(bytes32 => Listing) private _listings;
    mapping(address => string[2]) private _collections;

    struct Listing {
        address tokenContract;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        bool listed;
        uint256 updatedAt;
    }
    
    event LogListingAdded(bytes32 listingId, address tokenContract, uint256 tokenId, address seller, uint256 price);
    event LogListingUpdated(bytes32 listingId, uint256 price);
    event LogListingCanceled(bytes32 listingId, bool active);
    event LogListingSold(bytes32 listingId, address buyer, uint256 price);
    event LogCollectionCreated(address collectionAddress, address collectionOwner, string name, string symbol);
    
    function createERC721Collection(string memory _name, string memory _symbol) public {
        bytes memory tempName = bytes(_name);
        bytes memory tempSymbol = bytes(_symbol);
        require(tempName.length > 0 && tempSymbol.length > 0, "Name and Symbol are mandatory");
        
        LimePlaceNFT newCollection = new LimePlaceNFT(_name, _symbol);
        address collectionAddress = address(newCollection);
        _collections[collectionAddress] = [_name, _symbol];
        emit LogCollectionCreated(collectionAddress, msg.sender, _name, _symbol);
    }
    
    // List the NFT on the marketplace
    function list(address _tokenContract, uint256 _tokenId, uint256 _price) public payable{
        require(_price > LISTING_FEE, "Price must be more than listing fee");
        require(msg.value == LISTING_FEE, "Not enough ether for listing fee");
        
        //check if token is supporting erc721
        require(_tokenContract.supportsInterface(0x80ac58cd), "This marketplace support only ERC721 tokens");
        require(IERC721(_tokenContract).isApprovedForAll(msg.sender, address (this)), "LimePlace should be approved for operator");
        bytes32 listingId = generateListingId(_tokenContract, _tokenId);
        _listings[listingId] = Listing(
            _tokenContract,
            _tokenId,
            payable(msg.sender),
            _price,
            true,
            block.timestamp
        );
        _pendingFees += msg.value;
        emit LogListingAdded(listingId, _tokenContract, _tokenId, msg.sender, _price);
    }
    
    //edit is used for edit price or cancel listing
    function editListing(bytes32 _listingId, uint256 _price) public {
        Listing storage listing = _listings[_listingId];
        require(msg.sender == listing.seller, "You can edit only your listings");
        require(_price > 0, "The price should be more than 0");
        //edit price
        listing.price = _price;
        listing.updatedAt = block.timestamp;
        
        emit LogListingUpdated(_listingId, _price);
    }
    
    function cancelListing(bytes32 _listingId) public {
        Listing storage listing = _listings[_listingId];
        require(msg.sender == listing.seller, "You cancel only your listings");
        require(listing.listed == true, "Listing is already canceled");
        
        listing.listed = false;
        _pendingFees -= LISTING_FEE;
        payable (msg.sender).transfer(LISTING_FEE);
        
        emit LogListingCanceled(_listingId, false);
    }

    // Buy an NFT
    function buy(bytes32 _listingId) public payable isNotExpired(_listingId) {
        
        Listing storage listing = _listings[_listingId];
        require(listing.listed == true, "This listing is not active");
        require(msg.value == listing.price, "Value should be equal to the price");

        address payable buyer = payable(msg.sender);
        address payable seller = payable(listing.seller);
        listing.listed = false;
        
        _pendingFees -= LISTING_FEE;
        _fees += LISTING_FEE;
        
        IERC721(listing.tokenContract).transferFrom(seller, buyer, listing.tokenId);
        seller.transfer(msg.value);
        
        emit LogListingSold(_listingId, buyer, msg.value);
    }
    
    function getListing(bytes32 _listingId) public view returns (Listing memory) {
        return _listings[_listingId];
    }
    
    function getCollection(address _collectionAddress) public view returns (string[2] memory) {
        return _collections[_collectionAddress];
    }
    
    function generateListingId(address _contractAddress, uint256 _tokenId) public view returns(bytes32) {
        return keccak256(abi.encode(_contractAddress, _tokenId, block.timestamp));
    }
    
    function getBalance() external view onlyOwner returns(uint256) {
        return address(this).balance;
    }

    function getPendingFees() external view onlyOwner returns(uint256) {
        return _pendingFees;
    }

    function getFees() external view onlyOwner returns(uint256) {
        return _fees;
    }

    function withdrawFees() external onlyOwner {
        payable(msg.sender).transfer(_fees);
    }

    //modifiers
    modifier isNotExpired(bytes32 _listingId) {
        Listing storage listing = _listings[_listingId];
        uint256 oneMonth = 30 days;
        require(listing.updatedAt + oneMonth >= block.timestamp, "This listing is expired");
        _;
    }
}
