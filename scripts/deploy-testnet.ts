import { ethers, config } from "hardhat";
import { HttpNetworkConfig} from "hardhat/types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {LimePlace, LimePlace__factory} from "../typechain-types";

export async function main(networkName: string) {
    //read configurations
    const networkConfig = config.networks;
    const desiredNetwork = networkConfig[networkName];
    const {url, accounts} = desiredNetwork as HttpNetworkConfig;
    const provider = new ethers.providers.JsonRpcProvider(url);
    const signer = new ethers.Wallet((accounts as string[])[0], provider);
    const networkInfo = await provider.getNetwork();
    //deploy
    console.log("Deploying to network:", networkInfo.name);
    let marketPlace: LimePlace;
    const marketPlaceFactory = (await ethers.getContractFactory("LimePlace")) as LimePlace__factory;
    marketPlace = await marketPlaceFactory.connect(signer).deploy();
    await marketPlace.deployed();
    const ownerAddress = await signer.getAddress();
    console.log(
        `Address: ${marketPlace.address}\nOwner: ${ownerAddress}`
    );
}