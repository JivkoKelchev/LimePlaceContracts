// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract LimePlaceNFT is ERC721URIStorage{
    using Counters for Counters.Counter;

    Counters.Counter public tokenCount;
    event Mint(uint256 _tokenId);
    
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mint(string memory _tokenURI) external returns (uint256) {
        tokenCount.increment();

        _safeMint(msg.sender, tokenCount.current());
        _setTokenURI(tokenCount.current(), _tokenURI);

        emit Mint(tokenCount.current());
        return tokenCount.current();
    }
}
