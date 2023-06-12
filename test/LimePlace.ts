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
    //mint 1 unapproved token
    await nft.connect(user1).mint("testUri_3");
    
    //approve marketplace to operate
    await nft.connect(user1).approve(marketPlace.address, 1);
    await nft.connect(user2).approve(marketPlace.address, 2);
    //pay listing fee
    const options = {value: ethers.utils.parseEther("0.0001")}
    //list 2 NFTs
    await marketPlace.connect(user1).list(nft.address, 1, 100, options);
    await marketPlace.connect(user2).list(nft.address, 2, 150, options);
  });

  describe("listNft", () => {
    it("Should fail on price 0", async () => {
      expect(marketPlace.connect(user1).list(nft.address, 1, 0)).to.be.revertedWith(
          "Price must be at least 1 wei");
    });

    it("Should fail without listing fee", async () => {
      expect(marketPlace.connect(user1).list(nft.address, 1, 100)).to.be.revertedWith(
          "Not enough ether for listing fee");
    });

    it("Should fail if token not supporting ERC721", async () => {
      const options = {value: ethers.utils.parseEther("0.0001")}
      expect(marketPlace.connect(user1).list(marketPlace.address, 1, 100, options)).to.be.revertedWith(
          "This marketplace support only ERC721 tokens");
    });

    it("Should fail for tokens without approve", async () => {
      const options = {value: ethers.utils.parseEther("0.0001")}
      expect(marketPlace.connect(user1).list(nft.address, 3, 100, options)).to.be.revertedWith(
          "LimePlace should be approved for operator");
    });

    it("Should edit listing on resell", async () => {
      //pay listing fee
      const options = {value: ethers.utils.parseEther("0.0001")}
      await marketPlace.connect(user1).list(nft.address, 1, 90, options);
      const listingId = await marketPlace.generateListingId(nft.address, 1);
      const listing = await marketPlace.getListing(listingId);
      expect(listing.price).to.equal(90);
    })
    
  });

  describe("buyNft", () => {
    it("Should fail on value < price", async () => {
      const listingId = await marketPlace.generateListingId(nft.address, 1);
      expect(marketPlace.connect(user2).buy(listingId)).to.be.revertedWith(
          "Not enough ether to cover asking price");
    });

    it("Should transfer the token", async () => {
      const listingId = await marketPlace.generateListingId(nft.address, 1);
      const options = {value: 100}
      await marketPlace.connect(user2).buy(listingId, options);
      const newOwner = await nft.ownerOf(1)
      expect(newOwner).to.equal(user2.address);
    });

    it("Should cancel listing after buy", async () => {
      const listingId = await marketPlace.generateListingId(nft.address, 2);
      const options = {value: 150}
      await marketPlace.connect(user1).buy(listingId, options);
      const listing = await marketPlace.getListing(listingId);
      expect(listing.listed).to.equal(false);
    });
  });

  describe("Edit Listing", () => {
    it("Should cancel listing", async () => {
      const listingId = await marketPlace.generateListingId(nft.address, 1);
      await marketPlace.connect(user1).editListing(listingId, 100, false);
      const listing = await marketPlace.getListing(listingId);
      expect(listing.listed).to.equal(false);
    });

    it("Should fail when edit others listings", async () => {
      const listingId = await marketPlace.generateListingId(nft.address, 2);
      expect(marketPlace.connect(user1).editListing(listingId, 100, false)).to.be.revertedWith(
          "You can edit only your NFTs!");
    });

    it("Should edit the price", async () => {
      const listingId = await marketPlace.generateListingId(nft.address, 1);
      await marketPlace.connect(user1).editListing(listingId, 69, true);
      const listing = await marketPlace.getListing(listingId);
      expect(listing.price).to.equal(69);
    });
  });
  
});