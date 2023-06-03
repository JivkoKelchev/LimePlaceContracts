import { LimePlaceNFT__factory, LimePlaceNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("NFT", () => {

  let nft: LimePlaceNFT;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;

  before(async () => {
    const nftFactory = (await ethers.getContractFactory("LimePlaceNFT")) as LimePlaceNFT__factory;
    nft = await nftFactory.deploy("LimePlaceNFT", "LPNFT");
    await nft.deployed();

    [deployer, addr1] = await ethers.getSigners();
  });

  describe("Deployment", () => {
    it("Should set name and symbol", async () => {
      expect(await nft.name()).to.equal("LimePlaceNFT");
      expect(await nft.symbol()).to.equal("LPNFT");
    });
  });

  describe("Minting", () => {

    const URI = "ipfs://QmQ9Z";

    it("Should mint a token", async () => {
      const mint = await nft.connect(addr1).mint(URI);
      await mint.wait();

      expect(await nft.ownerOf(1)).to.equal(addr1.address);

      expect(await nft.tokenCount()).to.equal(1);
    });

    it("Should set token URI", async () => {
      expect(await nft.tokenURI(1)).to.equal(URI);
    });
  });
});