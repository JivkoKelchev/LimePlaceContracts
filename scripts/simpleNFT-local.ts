import { ethers } from "hardhat";
import { SimpleNFT__factory,  SimpleNFT} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

async function main() {
    let nft: SimpleNFT;
    let owner: SignerWithAddress;
    [owner] = await ethers.getSigners();
    
    const nftFactory = (await ethers.getContractFactory("SimpleNFT")) as SimpleNFT__factory;
    nft = await nftFactory.deploy("SimpleNFT", "SMPL");
    await nft.deployed();
    
    console.log("Contract deployed: " + nft.address);
    const tx = await nft.mint(BigInt('98112369686967182053727106400207961392751852721952227702583742928026303725569'));
    await tx.wait();
    console.log("Token minted. ID: 98112369686967182053727106400207961392751852721952227702583742928026303725569");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});