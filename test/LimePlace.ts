import { LimePlaceNFT__factory, LimePlaceNFT, LimePlace, LimePlace__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import {BigNumber} from "ethers";

describe("LimePlace", () => {
  
  const LISTING_FEE = 0.0001; //fee in eth
  
  async function deploy() {
    // Contracts are deployed using the first signer/account by default
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    [owner, user1, user2] = await ethers.getSigners();
    
    const marketPlaceFactory = (await  ethers.getContractFactory("LimePlace")) as LimePlace__factory;
    const marketPlace = await marketPlaceFactory.deploy();
    await marketPlace.deployed();

    const nftFactory = (await ethers.getContractFactory("LimePlaceNFT")) as LimePlaceNFT__factory;
    const nft = await nftFactory.deploy("LimePlaceNFT", "LPNFT");
    await nft.deployed();
    
    //mint 2 NFTs
    await nft.connect(user1).mint("testUri_1");
    await nft.connect(user2).mint("testUri_2");
    
    //approve marketplace to operate
    await nft.connect(user1).setApprovalForAll(marketPlace.address, true);
    await nft.connect(user2).setApprovalForAll(marketPlace.address, true);
    //pay listing fee
    const options = {value: ethers.utils.parseEther(LISTING_FEE.toString())}
    //list 2 NFTs
    const listingId1 = await listNFT(marketPlace,user1,nft,1,100,options);
    const listingId2 = await listNFT(marketPlace, user2, nft,2, 150, options);
   
    return { marketPlace, nft, owner, user1, user2, listingId1, listingId2};
  }
  
  async function listNFT(
      marketPlace: LimePlace, 
      user: SignerWithAddress, 
      nft: LimePlaceNFT, 
      tokenId: number, 
      price: number, 
      options: Object
  ) : Promise<string> {
    //wait transaction to complete in order to get listingId
    const tx = await marketPlace.connect(user).list(nft.address, tokenId, price, options);
    const rc = await tx.wait(); // 0ms, as tx is already confirmed
    const events = rc?.events;
    if(events === undefined) {
      return '';
    }
    const event = events.find(event => event.event === 'LogListingAdded');
    const listingId = event?.args?.[0];
    return listingId ?? '';
  }
  
  

  describe("List Nft", () => {
    it("Should fail on price 0", async () => {
      const {marketPlace, nft, user1} = await loadFixture(deploy);
      expect(marketPlace.connect(user1).list(nft.address, 1, 0)).to.be.revertedWith(
          "Price must be at least 1 wei");
    });

    it("Should fail without listing fee", async () => {
      const {marketPlace, nft, user1} = await loadFixture(deploy);
      //todo add await when expect revertedWith
      await expect(marketPlace.connect(user1).list(nft.address, 1, 100)).to.be.revertedWith(
          "Not enough ether for listing fee");
    });

    it("Should fail if token not supporting ERC721", async () => {
      const {marketPlace, nft, user1} = await loadFixture(deploy);
      const options = {value: ethers.utils.parseEther("0.0001")}
      expect(marketPlace.connect(user1).list(marketPlace.address, 1, 100, options)).to.be.revertedWith(
          "This marketplace support only ERC721 tokens");
    });

    it("Should fail for tokens without approve", async () => {
      const {marketPlace, nft, owner} = await loadFixture(deploy);
      const options = {value: ethers.utils.parseEther("0.0001")}
      //mint unapproved token
      await nft.connect(owner).mint('test_69');
      await expect(marketPlace.connect(owner).list(nft.address, 3, 100, options)).to.be.revertedWith(
          "LimePlace should be approved for operator");
    });

    it("Should list with correct price", async () => {
      const {marketPlace, listingId1} = await loadFixture(deploy);
      const listing = await marketPlace.getListing(listingId1);
      expect(listing.price).to.equal(100);
    })

    it("Should pay fees", async () => {
      const {marketPlace, owner} = await loadFixture(deploy);
      const balance = await marketPlace.connect(owner).getBalance();
      const pendingFees = await marketPlace.connect(owner).getPendingFees();
      const expectedFees = ethers.utils.parseEther(LISTING_FEE.toString());
      expect(balance).to.equal(pendingFees).to.equal(expectedFees.mul(2));
    })
    
    it("Should emit event LogListingAdded", async () => {
      const { marketPlace, nft, user1 } = await loadFixture(deploy);
      await nft.connect(user1).mint('test_69');
      expect(marketPlace.connect(user1).list(nft.address, 3, 15))
          .to.emit(marketPlace, 'LogListingAdded');
    });
  });

  describe("Edit Listing", () => {
    it("Should fail on 0 price", async () => {
      const { marketPlace, nft, user1, listingId1 } = await loadFixture(deploy);
      await expect(marketPlace.connect(user1).editListing(listingId1, 0)).to.revertedWith(
        'The price should be more than 0'  
      );
    });

    it("Should fail when edit others listings", async () => {
      const {marketPlace, user1, listingId2 } = await loadFixture(deploy);
      await expect(marketPlace.connect(user1).editListing(listingId2, 100)).to.be.revertedWith(
          "You can edit only your listings");
    });

    it("Should edit the price", async () => {
      const {marketPlace, user1, listingId1 } = await loadFixture(deploy);
      await marketPlace.connect(user1).editListing(listingId1, 69);
      const listing = await marketPlace.getListing(listingId1);
      expect(listing.price).to.equal(69);
    });

    it("Should update the timestamp", async () => {
      const {marketPlace, user1, listingId1 } = await loadFixture(deploy);
      const listingBeforeUpdate = await marketPlace.getListing(listingId1);
      await marketPlace.connect(user1).editListing(listingId1, 69);
      const listingAfterUpdate = await marketPlace.getListing(listingId1);
      expect(listingBeforeUpdate.updatedAt).to.lt(listingAfterUpdate.updatedAt);
    });
  });

  describe("Cancel Listing", () => {
    it("Should fail when cancel others listings", async () => {
      const {marketPlace, user1, listingId2 } = await loadFixture(deploy);
      await expect(marketPlace.connect(user1).cancelListing(listingId2)).to.be.revertedWith(
          "You cancel only your listings");
    });
    
    it("Should fail when cancel canceled listings", async () => {
      const {marketPlace, user1, listingId1 } = await loadFixture(deploy);
      await marketPlace.connect(user1).cancelListing(listingId1);
      await expect(marketPlace.connect(user1).cancelListing(listingId1)).to.be.revertedWith(
          "Listing is already canceled");
    });

    it("Should change listed state", async () => {
      const {marketPlace, user1, listingId1 } = await loadFixture(deploy);
      await marketPlace.connect(user1).cancelListing(listingId1);
      const listing = await marketPlace.getListing(listingId1);
      expect(listing.listed).to.equal(false);
    });

    it("Should return listing fee", async () => {
      const {marketPlace, user1, listingId1 } = await loadFixture(deploy);
      const balanceBefore = await user1.getBalance();
      let tx = await marketPlace.connect(user1).cancelListing(listingId1);
      let receipt = await tx.wait();
      let gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const balanceAfter = await user1.getBalance();
      let listingFee = ethers.utils.parseEther(LISTING_FEE.toString());
      expect(balanceBefore.add(listingFee).sub(gasCost)).to.equal(balanceAfter);
    });
    
  });

  describe("Buy Nft", () => {
    it("Should fail on canceld listings", async () => {
      const {marketPlace, user1, user2, listingId1 } = await loadFixture(deploy);
      await marketPlace.connect(user1).cancelListing(listingId1);
      await expect(marketPlace.connect(user2).buy(listingId1)).to.be.revertedWith(
          "This listing is not active");
    });
    
    
    it("Should fail on value < price", async () => {
      const {marketPlace, user2, listingId1 } = await loadFixture(deploy);
      await expect(marketPlace.connect(user2).buy(listingId1)).to.be.revertedWith(
          "Not enough ether to cover asking price");
    });

    it("Should transfer the token", async () => {
      const {marketPlace, nft, user1, listingId2 } = await loadFixture(deploy);
      const options = {value: 150}
      await marketPlace.connect(user1).buy(listingId2, options);
      const newOwner = await nft.ownerOf(2)
      expect(newOwner).to.equal(user1.address);
    });

    it("Should cancel listing after buy", async () => {
      const {marketPlace, user1, listingId2 } = await loadFixture(deploy);
      const options = {value: 150}
      await marketPlace.connect(user1).buy(listingId2, options);
      const listing = await marketPlace.getListing(listingId2);
      expect(listing.listed).to.equal(false);
    });

    it("Should move fees from pending", async () => {
      const {marketPlace, owner, user1, listingId2 } = await loadFixture(deploy);
      const options = {value: 150}
      await marketPlace.connect(user1).buy(listingId2, options);
      const balance = await marketPlace.connect(owner).getBalance();
      const pendingFees = await marketPlace.connect(owner).getPendingFees();
      const fees = await marketPlace.connect(owner).getFees();
      const expectedFees = ethers.utils.parseEther(LISTING_FEE.toString());
      expect(balance.div(2)).to.equal(pendingFees).to.equal(fees).to.equal(expectedFees);
    });

    it("Should fail expired listing", async () => {
      const {marketPlace, nft, user2} = await loadFixture(deploy);
      //set future block timestamp
      const block = await ethers.provider.getBlock('latest');
      const currentTimestamp = block.timestamp; // Get the current block timestamp
      const twoMonths = 61 * 24 * 60 * 60; // Equivalent number of seconds in a month
      // Set the desired older timestamp
      await ethers.provider.send('evm_setNextBlockTimestamp', [currentTimestamp + twoMonths]);

      const listingId = await marketPlace.generateListingId(nft.address, 1);
      const options = {value: 100}
      await expect(marketPlace.connect(user2).buy(listingId, options)).to.be.revertedWith(
          "This listing is expired");
    });

    it("Should emit event LogListingSold", async () => {
      const { marketPlace, user2, listingId1} = await loadFixture(deploy);
      const options = {value: 100}
      expect(marketPlace.connect(user2).buy(listingId1, options))
          .to.emit(marketPlace, 'LogListingSold')
          .withArgs(listingId1, user2.address, 100);
    });
    
  });

  describe("Test owner functions", () => {
    it("Should fail if user call getBalance()", async () => {
      const {marketPlace, user1} = await loadFixture(deploy);
      await expect(marketPlace.connect(user1).getBalance()).to.be.revertedWith(
          "Ownable: caller is not the owner");
    });

    it("Should fail if user call getPendingFees()", async () => {
      const {marketPlace, user1} = await loadFixture(deploy);
      await expect(marketPlace.connect(user1).getPendingFees()).to.be.revertedWith(
          "Ownable: caller is not the owner");
    });

    it("Should fail if user call getFees()", async () => {
      const {marketPlace, user1} = await loadFixture(deploy);
      await expect(marketPlace.connect(user1).getFees()).to.be.revertedWith(
          "Ownable: caller is not the owner");
    });

    it("Should fail if user call withdrawFees()", async () => {
      const {marketPlace, user1} = await loadFixture(deploy);
      await expect(marketPlace.connect(user1).withdrawFees()).to.be.revertedWith(
          "Ownable: caller is not the owner");
    });

    it("Should withdraw Fees", async () => {
      const {marketPlace, owner, user1, listingId2 } = await loadFixture(deploy);
      const options = {value: 150}
      await marketPlace.connect(user1).buy(listingId2, options);
      const fees = await marketPlace.connect(owner).getFees();
      
      const ownerBalanceBefore = await owner.getBalance();
      let tx = await marketPlace.connect(owner).withdrawFees();
      const ownerBalanceAfter = await owner.getBalance();
      
      let receipt = await tx.wait();
      let gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      expect(ownerBalanceBefore.add(fees).sub(gasCost)).to.equal(ownerBalanceAfter);
    });
    
  });
});