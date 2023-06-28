import { ethers } from "hardhat";
import { LimePlaceNFT__factory, LimePlaceNFT, LimePlace__factory,  LimePlace} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {

  let nft: LimePlaceNFT;
  let marketPlace: LimePlace;

  const nftFactory = (await ethers.getContractFactory("LimePlaceNFT")) as LimePlaceNFT__factory;
  nft = await nftFactory.deploy("LimePlaceNFT", "LPNFT");
  await nft.deployed();

  console.log(
      `LimePlaceNFT is deployed to ${nft.address}`
  );
  
  const marketPlaceFactory = (await ethers.getContractFactory("LimePlace")) as LimePlace__factory;
  marketPlace = await marketPlaceFactory.deploy();
  await marketPlace.deployed();


  console.log(
      `LimePlace is deployed to ${marketPlace.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
