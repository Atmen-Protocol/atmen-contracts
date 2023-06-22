const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    const ECCUtils = await ethers.getContractFactory("ECCUtils");
    const eccUtils = await ECCUtils.attach(process.env.ECC_ADDRESS);

    const AtmenSwap = await ethers.getContractFactory("AtmenSwap", {
        libraries: { ECCUtils: eccUtils.address },
    });
    const atmenSwap = await AtmenSwap.attach(
        process.env.ATMEN_ADDRESS
    );
    const secret = ethers.utils.randomBytes(32);
    console.log("Secret: ", secret);
    const commitID = await atmenSwap.commitmentFromSecret(secret);
    const recipient = "0xBDd182877dEc564d96c4A6e21920F237487d01aD";

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;

    const trs = await atmenSwap.openETHSwap(
        secret,
        timestampBefore + 100,
        recipient,
        {
            value: 100,
        }
    );
    console.log(await trs.wait());
    console.log("Transaction hash: ", trs.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
