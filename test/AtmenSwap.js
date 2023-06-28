const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe.only("AtmenSwap", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployAtmenSwap() {
        const ECCommitment = await ethers.getContractFactory("ECCommitment");
        const ecCommitment = await ECCommitment.deploy();

        const AtmenSwap = await ethers.getContractFactory("AtmenSwap", {
            libraries: { ECCommitment: ecCommitment.address },
        });

        const atmenSwap = await AtmenSwap.deploy(
            process.env.ENTRY_POINT_ADDRESS
        );

        return { atmenSwap, ecCommitment };
    }

    describe("Opening ETH swap", function () {
        it("Should open a ETH swap", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atmenSwap.openETHSwap(
                    commitID,
                    (await time.latest()) + 10000,
                    recipient,
                    {
                        value: ethers.utils.parseUnits("0.01", "ether"),
                    }
                )
            ).not.to.be.reverted;
        });

        it("Should fail to open a ETH swap: invalid value 0", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atmenSwap.openETHSwap(
                    commitID,
                    (await time.latest()) + 10000,
                    recipient,
                    {
                        value: ethers.utils.parseUnits("0.0000001", "ether"),
                    }
                )
            ).to.be.revertedWith("Invalid message value.");
        });

        it("Should fail to open a ETH swap: invalid timelock", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atmenSwap.openETHSwap(
                    commitID,
                    await time.latest(),
                    recipient,
                    {
                        value: ethers.utils.parseUnits("1", "ether"),
                    }
                )
            ).to.be.revertedWith("Timelock value must be in the future.");
        });

        it("Should fail to open a ETH swap: Swap has been already opened.", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            await atmenSwap.openETHSwap(
                commitID,
                (await time.latest()) + 10000,
                recipient,
                {
                    value: ethers.utils.parseUnits("0.1", "ether"),
                }
            );
            await expect(
                atmenSwap.openETHSwap(
                    commitID,
                    (await time.latest()) + 10000,
                    recipient,
                    {
                        value: ethers.utils.parseUnits("0.1", "ether"),
                    }
                )
            ).to.be.revertedWith("Commitment already exists.");
        });
    });

    describe("Opening ERC20 swap", function () {
        it("Should fail to open a ERC20 swap: Invalid message value.", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            await expect(
                atmenSwap.openERC20Swap(
                    commitID,
                    (await time.latest()) + 10000,
                    recipient,
                    process.env.ERC20_ADDRESS,
                    ethers.utils.parseUnits("0.1", "ether")
                )
            ).to.be.revertedWith("Invalid message value.");
        });
    });

    describe("Commitments", function () {
        it("Should create commitment from secret", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret =
                "0x1787f38d854231dfec2b27a0f621414d10bfa95970b3e576aed29e1e8287e51e";

            const commitID = await atmenSwap.commitmentFromSecret(secret);
            expect(commitID).to.equal(
                "0x000000000000000000000000b3dca5f0cab69500d9165dd025c3a7ff82dca55f"
            );
        });
        it("Should verify commitment", async function () {
            const { ecCommitment } = await loadFixture(deployAtmenSwap);

            const qx =
                "0x3ea9f9f1994da291a91e81b52819e4602c669b05e01f29ace4efba684929e3c2";
            const qy =
                "0x9e5b27cc7c5ecd0d93b0bd04a483952b7adeb9fc2f5d027b144c477cb4d73ccb";

            const hashedCommitment = await ecCommitment.commitmentFromPoint(
                qx,
                qy
            );
            const secret =
                "0x1787f38d854231dfec2b27a0f621414d10bfa95970b3e576aed29e1e8287e51e";

            expect(await ecCommitment.commitmentFromSecret(secret)).to.equal(
                hashedCommitment
            );
        });

        it("Should generate and verify random commitment", async function () {
            const { ecCommitment } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);

            const [qx, qy] = await ecCommitment.ecmul(
                await ecCommitment.gx(),
                await ecCommitment.gy(),
                ethers.BigNumber.from(secret)
            );

            const commitment = await ecCommitment.commitmentFromPoint(qx, qy);

            expect(await ecCommitment.commitmentFromSecret(secret)).to.equal(
                commitment
            );
        });

        it("Should generate random commitment and shared commitment and verify both", async function () {
            const { ecCommitment } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);

            const [qx, qy] = await ecCommitment.ecmul(
                await ecCommitment.gx(),
                await ecCommitment.gy(),
                ethers.BigNumber.from(secret)
            );

            const commitment = await ecCommitment.commitmentFromPoint(qx, qy);

            expect(await ecCommitment.commitmentFromSecret(secret)).to.equal(
                commitment
            );

            const sharedSecret = ethers.utils.randomBytes(32);
            const sharedCommitment =
                await ecCommitment.commitmentFromSharedSecret(
                    qx._hex,
                    qy._hex,
                    sharedSecret
                );

            const fieldOrder = BigInt(await ecCommitment.q());

            const modifiedSecret =
                (BigInt(`0x${Buffer.from(secret).toString("hex")}`) +
                    BigInt(`0x${Buffer.from(sharedSecret).toString("hex")}`)) %
                fieldOrder;

            const modifiedSecretHex = `0x${modifiedSecret.toString(16)}`;

            expect(
                await ecCommitment.commitmentFromSecret(modifiedSecretHex)
            ).to.equal(sharedCommitment);
        });
        it("Should calculate new secret from fixture", async function () {
            const { ecCommitment } = await loadFixture(deployAtmenSwap);
            const fieldOrder = BigInt(await ecCommitment.q());

            const secret =
                "0xf1befd679132c45c2bab3443b37d8b01438554aa78a97c71e69666c39ec9e8d2";
            const sharedSecret =
                "0x6750d5560b612c817730bc23d17c1e57b751bec65f2942eaae55c3f6536f71e3";
            const mirrorSwapID =
                "0x0000000000000000000000007c4ceda0837be719142857fc37febba836cc748c";
            const originalSwapID =
                "0x00000000000000000000000064802c18190cb9d1012dc6d422f403bac1cf3068";

            expect(originalSwapID).to.equal(
                await ecCommitment.commitmentFromSecret(secret)
            );

            const modifiedSecret =
                (BigInt(secret) + BigInt(sharedSecret)) % fieldOrder;

            expect(mirrorSwapID).to.equal(
                await ecCommitment.commitmentFromSecret(
                    "0x" + modifiedSecret.toString(16).padStart(64, "0")
                )
            );

            expect(modifiedSecret.toString(16)).to.equal(
                "590fd2bd9c93f0dda2dbf06784f9a95a4028368a288a1f20d519cc2d22031974"
            );
        });
    });

    describe.only("Validate user operations", function () {
        it("Should validate signature", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            const timelock = (await time.latest()) + 10000;
            const openTrs = await atmenSwap.openETHSwap(
                commitID,
                timelock,
                recipient,
                {
                    value: ethers.utils.parseUnits("0.01", "ether"),
                }
            );
            await expect(openTrs).not.to.be.reverted;

            const userOp = {
                sender: ethers.Wallet.createRandom().address,
                nonce: 0,
                initCode: ethers.utils.randomBytes(0),
                callData:
                    commitID + Buffer.from(secret).toString("hex") + "fc334e8c",
                callGasLimit: 0,
                verificationGasLimit: 0,
                preVerificationGas: 0,
                maxFeePerGas: 0,
                maxPriorityFeePerGas: 0,
                paymasterAndData: ethers.utils.randomBytes(0),
                signature: ethers.utils.randomBytes(0),
            };

            const validateTrsResult = await atmenSwap.validateSignature_test(
                userOp
            );
            expect(validateTrsResult).to.equal(true);
        });
        it("Should validate signature from fixture", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID =
                "0x0000000000000000000000007092418b5996bd1dfc47bb62deafb3f805fdf4ee";
            const callData =
                "0x0000000000000000000000007092418b5996bd1dfc47bb62deafb3f805fdf4eee0c204d06480987d55e90ee545922884f0e504d7fcecd455290168e163feaad9fc334e8c";
            const recipient = ethers.Wallet.createRandom().address;
            const timelock = (await time.latest()) + 10;

            const openTrs = await atmenSwap.openETHSwap(
                commitID,
                timelock,
                recipient,
                {
                    value: ethers.utils.parseUnits("0.01", "ether"),
                }
            );
            await expect(openTrs).not.to.be.reverted;

            const userOp = {
                sender: ethers.Wallet.createRandom().address,
                nonce: 0,
                initCode: ethers.utils.randomBytes(0),
                callData: callData,
                callGasLimit: 0,
                verificationGasLimit: 0,
                preVerificationGas: 0,
                maxFeePerGas: 0,
                maxPriorityFeePerGas: 0,
                paymasterAndData: ethers.utils.randomBytes(0),
                signature: ethers.utils.randomBytes(0),
            };

            const validateTrsResult = await atmenSwap.validateSignature_test(
                userOp
            );
            // const requiredGas =
            //     userOp.callGasLimit +
            //     userOp.verificationGasLimit +
            //     userOp.preVerificationGas;
            // const requiredPrefund = requiredGas * userOp.maxFeePerGas;
            // const entryPointAddr = await atmenSwap.entryPoint();

            // // send money to entry point
            // const [signer] = await ethers.getSigners();
            // const trs = await signer.sendTransaction({
            //     to: entryPointAddr,
            //     value: ethers.utils.parseEther("20"),
            //     gasPrice: 2000000000,
            // });

            // await trs.wait();

            // await hre.network.provider.request({
            //     method: "hardhat_impersonateAccount",
            //     params: [entryPointAddr],
            // });
            // const entryPointSigner = await ethers.getSigner(entryPointAddr);
            // console.log("entryPointSigner", entryPointSigner.address);
            // const validateTrsResult = await atmenSwap
            //     .connect(entryPointSigner)
            //     .validateUserOp(userOp, ethers.utils.randomBytes(32), 0);
            // // await time.increase(101);
            // console.log("validateTrsResult", await validateTrsResult.wait());

            expect(validateTrsResult).to.equal(true);
        });

        it("Should fail to validate signature: invalid selector", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            const timelock = (await time.latest()) + 10000;
            const openTrs = await atmenSwap.openETHSwap(
                commitID,
                timelock,
                recipient,
                {
                    value: ethers.utils.parseUnits("0.01", "ether"),
                }
            );
            await expect(openTrs).not.to.be.reverted;

            const userOp = {
                sender: ethers.Wallet.createRandom().address,
                nonce: 0,
                initCode: ethers.utils.randomBytes(0),
                callData:
                    commitID + Buffer.from(secret).toString("hex") + "00000000",
                callGasLimit: 0,
                verificationGasLimit: 0,
                preVerificationGas: 0,
                maxFeePerGas: 0,
                maxPriorityFeePerGas: 0,
                paymasterAndData: ethers.utils.randomBytes(0),
                signature: ethers.utils.randomBytes(0),
            };
            const validateTrs = await atmenSwap.validateSignature_test(userOp);
            expect(validateTrs).to.equal(false);
        });
        it("Should fail to validate signature: invalid commit", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            const timelock = (await time.latest()) + 10000;
            const openTrs = await atmenSwap.openETHSwap(
                commitID,
                timelock,
                recipient,
                {
                    value: ethers.utils.parseUnits("0.01", "ether"),
                }
            );
            await expect(openTrs).not.to.be.reverted;

            const userOp = {
                sender: ethers.Wallet.createRandom().address,
                nonce: 0,
                initCode: ethers.utils.randomBytes(0),
                callData:
                    "0x" +
                    Buffer.from(ethers.utils.randomBytes(32)).toString("hex") +
                    Buffer.from(secret).toString("hex") +
                    "fc334e8c",
                callGasLimit: 0,
                verificationGasLimit: 0,
                preVerificationGas: 0,
                maxFeePerGas: 0,
                maxPriorityFeePerGas: 0,
                paymasterAndData: ethers.utils.randomBytes(0),
                signature: ethers.utils.randomBytes(0),
            };
            const validateTrs = await atmenSwap.validateSignature_test(userOp);
            expect(validateTrs).to.equal(false);
        });
        it("Should fail to validate signature: invalid secret", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            const timelock = (await time.latest()) + 10000;
            const openTrs = await atmenSwap.openETHSwap(
                commitID,
                timelock,
                recipient,
                {
                    value: ethers.utils.parseUnits("0.01", "ether"),
                }
            );
            await expect(openTrs).not.to.be.reverted;

            const userOp = {
                sender: ethers.Wallet.createRandom().address,
                nonce: 0,
                initCode: ethers.utils.randomBytes(0),
                callData:
                    commitID +
                    Buffer.from(ethers.utils.randomBytes(32)).toString("hex") +
                    "fc334e8c",
                callGasLimit: 0,
                verificationGasLimit: 0,
                preVerificationGas: 0,
                maxFeePerGas: 0,
                maxPriorityFeePerGas: 0,
                paymasterAndData: ethers.utils.randomBytes(0),
                signature: ethers.utils.randomBytes(0),
            };
            const validateTrs = await atmenSwap.validateSignature_test(userOp);
            expect(validateTrs).to.equal(false);
        });
        it("Should fail to validate signature: invalid gas price", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            const timelock = (await time.latest()) + 10000;
            const openTrs = await atmenSwap.openETHSwap(
                commitID,
                timelock,
                recipient,
                {
                    value: ethers.utils.parseUnits("0.01", "ether"),
                }
            );
            await expect(openTrs).not.to.be.reverted;

            const userOp = {
                sender: ethers.Wallet.createRandom().address,
                nonce: 0,
                initCode: ethers.utils.randomBytes(0),
                callData:
                    commitID + Buffer.from(secret).toString("hex") + "fc334e8c",
                callGasLimit: 0,
                verificationGasLimit: 0,
                preVerificationGas: 0,
                maxFeePerGas: 0x01,
                maxPriorityFeePerGas: 0x01,
                paymasterAndData: ethers.utils.randomBytes(0),
                signature: ethers.utils.randomBytes(0),
            };
            const validateTrs = await atmenSwap.validateSignature_test(userOp);
            expect(validateTrs).to.equal(false);
        });
    });

    describe("Closing swaps", function () {
        it("Should open and close a ETH swap", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            const timelock = (await time.latest()) + 10000;
            const openTrs = await atmenSwap.openETHSwap(
                commitID,
                timelock,
                recipient,
                {
                    value: ethers.utils.parseUnits("0.01", "ether"),
                }
            );

            await expect(openTrs).not.to.be.reverted;
            const openTrsReceipt = await openTrs.wait();
            let gasUsed = openTrsReceipt.gasUsed.toNumber();
            console.log("Gas used:", openTrsReceipt.gasUsed.toNumber());

            const commitmentTimelock = await atmenSwap.commitments(commitID);
            expect(commitmentTimelock).to.equal(timelock);

            const closeTrs = await atmenSwap.close(commitID, secret);

            await expect(closeTrs).not.to.be.reverted;
            const closeTrsReceipt = await closeTrs.wait();
            console.log("Gas used:", closeTrsReceipt.gasUsed.toNumber());
            gasUsed += closeTrsReceipt.gasUsed.toNumber();
            console.log("Total gas used:", gasUsed);

            const commitmentTimelockNoMore = await atmenSwap.commitments(
                commitID
            );
            expect(commitmentTimelockNoMore).to.equal(0);
        });

        it("Should fail to close a ETH swap: Commitment does not exist", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const commitID = ethers.utils.randomBytes(32);
            const secret = ethers.utils.randomBytes(32);
            await expect(atmenSwap.close(commitID, secret)).to.be.revertedWith(
                "Commitment does not exist."
            );
        });

        it("Should open and fail close a ETH swap: Invalid secret", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atmenSwap.openETHSwap(
                    commitID,
                    (await time.latest()) + 10000,
                    recipient,
                    {
                        value: ethers.utils.parseUnits("0.01", "ether"),
                    }
                )
            ).not.to.be.reverted;

            await expect(
                atmenSwap.close(commitID, ethers.utils.randomBytes(32))
            ).to.be.revertedWith("Invalid secret.");
        });

        it("Should open and fail close a ETH swap: Commitment has expired", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atmenSwap.openETHSwap(
                    commitID,
                    (await time.latest()) + 100,
                    recipient,
                    {
                        value: ethers.utils.parseUnits("0.01", "ether"),
                    }
                )
            ).not.to.be.reverted;
            await time.increase(101);

            await expect(atmenSwap.close(commitID, secret)).to.be.revertedWith(
                "Commitment has expired."
            );
        });
    });

    describe("Redeeming swaps", function () {
        it("Should open and redeem an expired ETH swap", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            const timelock = (await time.latest()) + 100;
            await expect(
                atmenSwap.openETHSwap(commitID, timelock, recipient, {
                    value: ethers.utils.parseUnits("0.01", "ether"),
                })
            ).not.to.be.reverted;
            await time.increaseTo(timelock);

            await expect(atmenSwap.expire(commitID)).not.to.be.reverted;
        });

        it("Should fail to redeem an ETH swap: swap has not expired", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            const timelock = (await time.latest()) + 100;
            await expect(
                atmenSwap.openETHSwap(commitID, timelock, recipient, {
                    value: ethers.utils.parseUnits("0.01", "ether"),
                })
            ).not.to.be.reverted;
            await time.increaseTo(timelock - 1);

            await expect(atmenSwap.expire(commitID)).to.be.revertedWith(
                "Commitment has not expired."
            );
        });
    });

    describe("Events", async function () {
        it("Should emit an event on openETHSwap", async function () {
            const { atmenSwap } = await loadFixture(deployAtmenSwap);
            const secret = ethers.utils.randomBytes(32);
            const commitID = await atmenSwap.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            const timelock = (await time.latest()) + 100;
            await expect(
                atmenSwap.openETHSwap(commitID, timelock, recipient, {
                    value: ethers.utils.parseUnits("0.01", "ether"),
                })
            )
                .to.emit(atmenSwap, "Open")
                .withArgs(commitID);
        });
    });
});
