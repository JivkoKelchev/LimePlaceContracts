import { ethers } from "hardhat";
import {LimePlace__factory,  LimePlace} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

export async function main() {
  let owner: SignerWithAddress;
  [owner] = await ethers.getSigners();
  let marketPlace: LimePlace;

  const marketPlaceFactory = (await ethers.getContractFactory("LimePlace")) as LimePlace__factory;
  marketPlace = await marketPlaceFactory.deploy();
  await marketPlace.deployed();

  const ownerAddress = await owner.getAddress();
  console.log("Deploying to network: localhost");
  console.log(
      `Address: ${marketPlace.address}\nOwner: ${ownerAddress}`
  );
}
