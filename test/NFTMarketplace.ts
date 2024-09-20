import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTMarketplace } from "../typechain-types";

describe("NFTMarketplace", function () {
  let nftMarketplace: NFTMarketplace;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addrs: any[];

  beforeEach(async function () {
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy contract instance before each test
    nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await nftMarketplace.owner()).to.equal(owner.address);
    });

    it("Should have the correct name and symbol", async function () {
      expect(await nftMarketplace.name()).to.equal("NFTMarketplace");
      expect(await nftMarketplace.symbol()).to.equal("NFTM");
    });
  });

  describe("Minting", function () {
    it("Should mint a new token", async function () {
      await nftMarketplace.mint("https://w3b.com/token1");
      expect(await nftMarketplace.ownerOf(1)).to.equal(owner.address);
      expect(await nftMarketplace.tokenURI(1)).to.equal(
        "https://w3b.com/token1"
      );
    });

    it("Should increment token ID correctly", async function () {
      await nftMarketplace.mint("https://w3b.com/token1");
      await nftMarketplace.mint("https://w3b.com/token2");
      expect(await nftMarketplace.ownerOf(2)).to.equal(owner.address);
    });
  });

  describe("Listing", function () {
    beforeEach(async function () {
      await nftMarketplace.mint("https://w3b.com/token1");
    });

    it("Should list a token for sale", async function () {
      await nftMarketplace.listNFT(1, ethers.parseEther("1"));
      const listing = await nftMarketplace.listings(1);
      expect(listing.seller).to.equal(owner.address);
      expect(listing.price).to.equal(ethers.parseEther("1"));
      expect(listing.isActive).to.be.true;
    });

    it("Should not list a token that's already listed", async function () {
      await nftMarketplace.listNFT(1, ethers.parseEther("1"));
      await expect(nftMarketplace.listNFT(1, ethers.parseEther("2"))).to.be
        .revertedWithCustomError;
    });

    it("Should not list a token that's not owned by the sender", async function () {
      await expect(
        nftMarketplace.connect(addr1).listNFT(1, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError;
    });
  });

  describe("Buying", function () {
    beforeEach(async function () {
      await nftMarketplace.mint("https://w3b.com/token1");
      await nftMarketplace.listNFT(1, ethers.parseEther("1"));
    });

    it("Should allow buying a listed token", async function () {
      await nftMarketplace
        .connect(addr1)
        .buyNFT(1, { value: ethers.parseEther("1") });
      expect(await nftMarketplace.ownerOf(1)).to.equal(addr1.address);
    });

    it("Should not allow buying a token for less than the listed price", async function () {
      await expect(
        nftMarketplace
          .connect(addr1)
          .buyNFT(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWithCustomError(nftMarketplace, "InsufficientPayment");
    });

    it("Should transfer the correct amount to the seller", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(
        owner.address
      );
      await nftMarketplace
        .connect(addr1)
        .buyNFT(1, { value: ethers.parseEther("1") });
      const sellerBalanceAfter = await ethers.provider.getBalance(
        owner.address
      );
      expect(BigInt(sellerBalanceAfter) - BigInt(sellerBalanceBefore)).to.equal(
        ethers.parseEther("1")
      );
    });
  });

  describe("Canceling listing", function () {
    beforeEach(async function () {
      await nftMarketplace.mint("https://w3b.com/token1");
      await nftMarketplace.listNFT(1, ethers.parseEther("1"));
    });

    it("Should allow the seller to cancel the listing", async function () {
      await nftMarketplace.cancelListing(1);
      const listing = await nftMarketplace.listings(1);
      expect(listing.isActive).to.be.false;
    });

    it("Should not allow non-sellers to cancel the listing", async function () {
      await expect(nftMarketplace.connect(addr1).cancelListing(1)).to.be
        .revertedWithCustomError;
    });
  });

  describe("Withdrawing funds", function () {
    it("Should not allow non-owners to withdraw funds", async function () {
      await expect(
        nftMarketplace.connect(addr1).withdrawFunds()
      ).to.be.revertedWithCustomError(
        nftMarketplace,
        "OwnableUnauthorizedAccount"
      );
    });
  });
});
