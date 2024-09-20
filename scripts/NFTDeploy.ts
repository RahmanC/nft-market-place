import { ethers } from "hardhat";

async function main() {
  console.log("Deploying NFTMarketplace contract...");

  // Get the ContractFactory and Signers
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy the contract
  const nftMarketplace = await NFTMarketplace.deploy();
  await nftMarketplace.waitForDeployment();

  console.log("NFTMarketplace deployed to:", nftMarketplace.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
