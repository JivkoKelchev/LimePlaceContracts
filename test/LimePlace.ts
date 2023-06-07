import { LimePlaceNFT__factory, LimePlaceNFT, LimePlace, LimePlace__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("LimePlace", () => {

  let nft: LimePlaceNFT;
  let marketPlace: LimePlace;

  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  before(async () => {
    const marketPlaceFactory = (await  ethers.getContractFactory("LimePlace")) as LimePlace__factory;
    marketPlace = await marketPlaceFactory.deploy();
    await marketPlace.deployed();
    
    const nftFactory = (await ethers.getContractFactory("LimePlaceNFT")) as LimePlaceNFT__factory;
    nft = await nftFactory.deploy("LimePlaceNFT", "LPNFT");
    await nft.deployed();

    [deployer, user1, user2] = await ethers.getSigners();
    //mint 2 NFTs
    await nft.connect(user1).mint("testUri_1");
    await nft.connect(user2).mint("testUri_2");
    
    //approve marketplace to operate
    await nft.connect(user1).approve(marketPlace.address, 1);
    await nft.connect(user2).approve(marketPlace.address, 2);
    //pay listing fee
    const options = {value: ethers.utils.parseEther("0.0001")}
    //list 2 NFTs
    await marketPlace.connect(user1).listNft(nft.address, 1, 100, options);
    await marketPlace.connect(user2).listNft(nft.address, 2, 150, options);
  });

  describe("listNft", () => {
    it("Should fail on price 0", async () => {
      expect(marketPlace.connect(user1).listNft(nft.address, 1, 0)).to.be.revertedWith(
          "Price must be at least 1 wei");
    });
    
    it("Should add to listing", async () => {
      const allListings = await marketPlace.getListedNfts();
      expect(allListings.length).to.equal(2);
    })
    
    it("Should add to user listing", async () => {
      const userList = await marketPlace.getListedNftsByUser(user1.address);
      expect(userList.length).to.equal(1);
    })

    it("Should add to user tokens", async () => {
      const userTokens = await marketPlace.getNftsByUser(user1.address);
      expect(userTokens.length).to.equal(1);
    })

    it("Should add to collection listings", async () => {
      const collectionList = await marketPlace.getListedNftsByCollection(nft.address);
      expect(collectionList.length).to.equal(2);
    })

    it("Should edit listing", async () => {
      //pay listing fee
      const options = {value: ethers.utils.parseEther("0.0001")}
      await marketPlace.connect(user1).listNft(nft.address, 1, 90, options);
      const listingId = await marketPlace.generateTokenId(nft.address, 1);
      const listing = await marketPlace.getListing(listingId);
      expect(listing.price).to.equal(90);
    })
    
  });

  describe("buyNft", () => {
    it("Should fail on value < price", async () => {
      const listingId = await marketPlace.generateTokenId(nft.address, 1);
      expect(marketPlace.connect(user2).buyNft(listingId)).to.be.revertedWith(
          "Not enough ether to cover asking price");
    });

    it("Should transfer the token", async () => {
      const listingId = await marketPlace.generateTokenId(nft.address, 1);
      const options = {value: 100}
      await marketPlace.connect(user2).buyNft(listingId, options);
      const newOwner = await nft.ownerOf(1)
      expect(newOwner).to.equal(user2.address);
    });

    it("Should cancel listing after buy", async () => {
      const listingId = await marketPlace.generateTokenId(nft.address, 2);
      const options = {value: 150}
      await marketPlace.connect(user1).buyNft(listingId, options);
      const listing = await marketPlace.getListing(listingId);
      expect(listing.listed).to.equal(false);
    });
  });

  describe("cancelListing", () => {
    it("Should cancel listing", async () => {
      const listingId = await marketPlace.generateTokenId(nft.address, 1);
      await marketPlace.connect(user1).cancelListing(listingId);
      const listing = await marketPlace.getListing(listingId);
      expect(listing.listed).to.equal(false);
    });
  });
  
});