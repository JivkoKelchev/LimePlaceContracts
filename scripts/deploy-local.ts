import { ethers } from "hardhat";
import {LimePlace__factory,  LimePlace} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

export async function main() {
  let owner: SignerWithAddress;
  [owner] = await ethers.getSigners();

  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
  const signer = await provider.getSigner(owner.address);
  
  const marketPlaceFactory = (await ethers.getContractFactory("LimePlace")) as LimePlace__factory;
  const marketPlace = await marketPlaceFactory.connect(signer).deploy();
  await marketPlace.deployed();

  const ownerAddress = await owner.getAddress();
  console.log("Deploying to network: localhost");
  console.log(
      `Address: ${marketPlace.address}\nOwner: ${ownerAddress}`
  );
}
