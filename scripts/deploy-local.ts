import { ethers } from "hardhat";
import { LimePlaceNFT__factory, LimePlaceNFT, LimePlace__factory,  LimePlace} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
  let owner: SignerWithAddress;
  [owner] = await ethers.getSigners();
  let marketPlace: LimePlace;

  const marketPlaceFactory = (await ethers.getContractFactory("LimePlace")) as LimePlace__factory;
  marketPlace = await marketPlaceFactory.deploy();
  await marketPlace.deployed();

  const ownerAddress = await owner.getAddress();
  console.log(
      `Address: ${marketPlace.address}\nOwner: ${ownerAddress}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
