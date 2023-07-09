// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SimpleNFT is ERC721 {
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mint(uint _tokenId) external {
        _safeMint(msg.sender, _tokenId);
    }
}
