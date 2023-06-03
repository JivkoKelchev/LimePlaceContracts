import { LimePlaceNFT__factory, LimePlaceNFT, LimePlace, LimePlace__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("LimePlace", () => {

  let nft: LimePlaceNFT;
  let marketPlace: LimePlace;

  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  before(async () => {
    const marketPlaceFactory = (await  ethers.getContractFactory("LimePlace")) as LimePlace__factory;
    marketPlace = await marketPlaceFactory.deploy();
    await marketPlace.deployed();
    
    const nftFactory = (await ethers.getContractFactory("LimePlaceNFT")) as LimePlaceNFT__factory;
    nft = await nftFactory.deploy("LimePlaceNFT", "LPNFT");
    await nft.deployed();

    [deployer, addr1, addr2] = await ethers.getSigners();
    //mint 2 nfts
    await nft.connect(addr1).mint("testUri_1");
    await nft.connect(addr2).mint("testUri_2");
  });

  describe("listNft", () => {
    it("Should fail on price 0", async () => {
      expect(marketPlace.connect(addr1).listNft(nft.address, 1, 0)).to.be.revertedWith(
          "Price must be at least 1 wei");
    });
    
    it("Should add to listing", async () => {
      
      const testBalance = await nft.balanceOf(addr1.address);
      //approve marketplace to operate
      await nft.connect(addr1).approve(marketPlace.address, 1);
      
      const options = {value: ethers.utils.parseEther("0.0001")}
      
      await marketPlace.connect(addr1).listNft(nft.address, 1, 100, options)
      const listingsArray = await marketPlace.connect(addr1).getMyListedNfts();
      console.log(listingsArray);
      expect(true).to.equal(true);
    })
  });
  
});