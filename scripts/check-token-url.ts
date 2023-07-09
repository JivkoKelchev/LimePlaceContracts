import { ethers, config } from "hardhat";
import { HttpNetworkConfig} from "hardhat/types";
import * as abi from '../artifacts/contracts/SimpleNFT.sol/SimpleNFT.json'
import {SimpleNFT} from "../typechain-types/contracts/SimpleNFT.sol";

export async function main() {
    //read configurations
    const networkConfig = config.networks;
    const desiredNetwork = networkConfig['goerli'];
    const {url, accounts} = desiredNetwork as HttpNetworkConfig;
    const provider = new ethers.providers.JsonRpcProvider(url);
    const signer = new ethers.Wallet((accounts as string[])[0], provider);
    const networkInfo = await provider.getNetwork();
    //deploy
    const simpleNFT = new ethers.Contract('0x9c642997326c116109c100f59248cd4ff1a3c12d', abi.abi, provider);
    const uri = await simpleNFT.tokenURI(BigInt('98112369686967182053727106400207961392751852721952227702583742928026303725569'));;
    const ownerAddress = await signer.getAddress();
    console.log(
        `Token URI: ${uri}\nOwner: ${ownerAddress}`
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});