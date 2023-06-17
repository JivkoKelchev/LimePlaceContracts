// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract LimePlace {
    uint256 public LISTING_FEE = 100000000000000 wei;
    uint256 private pendingFees;
    uint256 private fees;
    
    mapping(bytes32 => Listing) private _listings;

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

    // List the NFT on the marketplace
    function list(address _tokenContract, uint256 _tokenId, uint256 _price) public payable returns(bytes32){
        require(_price > 0, "Price must be at least 1 wei");
        require(msg.value == LISTING_FEE, "Not enough ether for listing fee");
        
        //check if token is supporting erc721
        require(IERC721(_tokenContract).supportsInterface(0x80ac58cd), "This marketplace support only ERC721 tokens");
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
        pendingFees += msg.value;
        emit LogListingAdded(listingId, _tokenContract, _tokenId, msg.sender, _price);
        return listingId;
    }
    
    //edit is used for edit price or cancel listing
    function editListing(bytes32 _listingId, uint256 _price) public {
        Listing storage listing = _listings[_listingId];
        require(msg.sender == listing.seller, "You can edit only your listings");
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
        pendingFees -= LISTING_FEE;
        payable (msg.sender).transfer(LISTING_FEE);
        
        emit LogListingCanceled(_listingId, false);
    }

    // Buy an NFT
    function buy(bytes32 _listingId) public payable isNotExpired(_listingId) {
        
        Listing storage listing = _listings[_listingId];
        require(listing.listed == true, "This listing is not active");
        require(msg.value >= listing.price, "Not enough ether to cover asking price");

        address payable buyer = payable(msg.sender);
        address payable seller = payable(listing.seller);
        listing.listed = false;
        
        pendingFees -= LISTING_FEE;
        fees += LISTING_FEE;
        
        IERC721(listing.tokenContract).transferFrom(seller, buyer, listing.tokenId);
        seller.transfer(msg.value);
        
        emit LogListingSold(_listingId, buyer, msg.value);
    }
    
    function getListing(bytes32 _listingId) public view returns (Listing memory) {
        return _listings[_listingId];
    }
    
    function generateListingId(address _contractAddress, uint256 _tokenId) public view returns(bytes32) {
        return keccak256(abi.encode(_contractAddress, _tokenId, block.timestamp));
    }

    //modifiers
    modifier isNotExpired(bytes32 _listingId) {
        Listing storage listing = _listings[_listingId];
        uint256 oneMonth = 30 days;
        require(listing.updatedAt + oneMonth >= block.timestamp, "This listing is expired!");
        _;
    }
    
    //check for wrapped ether
    //https://sepolia.etherscan.io/token/0x7b79995e5f793a07bc00c21412e50ecae098e7f9
}
