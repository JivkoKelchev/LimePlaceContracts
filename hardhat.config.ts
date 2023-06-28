import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { config as dotEnvConfig } from "dotenv";
dotEnvConfig()
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 5,
      accounts: [
        `${process.env.PRIVATE_KEY}`,
      ],
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 11155111,
      accounts: [
        `${process.env.PRIVATE_KEY}`,
      ],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
};


const lazyImport = async (module: any) => {
  return await import(module);
};

task("deploy-local", "Deploys contracts on local network").setAction(async () => {
  const { main } = await lazyImport("./scripts/deploy-local");
  await main();
});

task("deploy-sepolia", "Deploys contracts on Sepolia or Goerli network").setAction(async () => {
  const { main } = await lazyImport("./scripts/deploy-testnet");
  await main('sepolia');
});

task("deploy-goerli", "Deploys contracts on Sepolia or Goerli network").setAction(async () => {
  const { main } = await lazyImport("./scripts/deploy-testnet");
  await main('goerli');
});

export default config;
