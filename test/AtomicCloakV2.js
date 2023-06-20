const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe.only("AtomicCloakV2", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployAtomicCloak() {
        const ECCUtils = await ethers.getContractFactory("ECCUtils");
        const eccUtils = await ECCUtils.deploy();

        const AtomicCloak = await ethers.getContractFactory("AtomicCloakV2", {
            libraries: { ECCUtils: eccUtils.address },
        });
        const atomicCloak = await AtomicCloak.deploy(
            process.env.ENTRY_POINT_ADDRESS
        );

        return { atomicCloak, eccUtils };
    }

    describe("Opening ETH swap", function () {
        it("Should open a ETH swap", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atomicCloak.openETHSwap(
                    qx,
                    qy,
                    recipient,
                    (await time.latest()) + 10000,
                    {
                        value: ethers.utils.parseUnits("0.01", "ether"),
                    }
                )
            ).not.to.be.reverted;
        });

        it("Should fail to open a ETH swap: invalid value 0", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atomicCloak.openETHSwap(
                    qx,
                    qy,
                    recipient,
                    (await time.latest()) + 10000,
                    {
                        value: ethers.utils.parseUnits("0", "ether"),
                    }
                )
            ).to.be.revertedWith("Invalid message value.");
        });

        it("Should fail to open a ETH swap: invalid value smaller than fee", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atomicCloak.openETHSwap(
                    qx,
                    qy,
                    recipient,
                    (await time.latest()) + 10000,
                    {
                        value: ethers.utils.parseUnits("0.000001", "ether"),
                    }
                )
            ).to.be.revertedWith("Invalid message value.");
        });

        it("Should fail to open a ETH swap: invalid timelock", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atomicCloak.openETHSwap(
                    qx,
                    qy,
                    recipient,
                    await time.latest(),
                    {
                        value: 1000,
                    }
                )
            ).to.be.revertedWith("Timelock value must be in the future.");
        });

        it("Should fail to open a ETH swap: Swap has been already opened.", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            await atomicCloak.openETHSwap(
                qx,
                qy,
                recipient,
                (await time.latest()) + 10000,
                {
                    value: ethers.utils.parseUnits("0.1", "ether"),
                }
            );
            await expect(
                atomicCloak.openETHSwap(
                    qx,
                    qy,
                    recipient,
                    (await time.latest()) + 100,
                    {
                        value: ethers.utils.parseUnits("0.1", "ether"),
                    }
                )
            ).to.be.revertedWith("Swap has been already opened.");
        });
    });

    describe("Opening ERC20 swap", function () {
        it("Should fail to open a ERC20 swap: no reason", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;
            await expect(
                atomicCloak.openERC20Swap(
                    qx,
                    qy,
                    recipient,
                    (await time.latest()) + 10000,
                    process.env.ERC20_ADDRESS,
                    ethers.utils.parseUnits("0.1", "ether")
                )
            ).to.be.revertedWithoutReason();
        });

        it("Should fail to open a ERC20 swap: invalid ETH value", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atomicCloak.openERC20(
                    qx,
                    qy,
                    recipient,
                    (await time.latest()) + 10000,
                    process.env.ERC20_ADDRESS,
                    ethers.utils.parseUnits("0.1", "ether"),
                    {
                        value: ethers.utils.parseUnits("0.1", "ether"),
                    }
                )
            ).to.be.revertedWith(
                "Cannot send ETH when swapping an ERC20 token."
            );
        });

        it("Should fail to open a ERC20 swap: invalid timelock", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atomicCloak.openERC20(
                    qx,
                    qy,
                    recipient,
                    await time.latest(),
                    process.env.ERC20_ADDRESS,
                    ethers.utils.parseUnits("0.1", "ether")
                )
            ).to.be.revertedWith("Timelock value must be in the future.");
        });
    });

    describe("Commitments", function () {
        it("Should create commitment from secret", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret =
                "0x1787f38d854231dfec2b27a0f621414d10bfa95970b3e576aed29e1e8287e51e";

            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            expect(qx.toHexString()).to.equal(
                "0xaddcb45773b26a2f8ac2143627d54f47a12aab533dc1b41b4e791985e9eca496"
            );
            expect(qy.toHexString()).to.equal(
                "0x72da5adb3a30a2cf147d309b0cf58c76b322c82a5edae164e13dbeed6429c41d"
            );
        });

        it("Should verify commitment", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);

            const qx =
                "0xaddcb45773b26a2f8ac2143627d54f47a12aab533dc1b41b4e791985e9eca496";
            const qy =
                "0x72da5adb3a30a2cf147d309b0cf58c76b322c82a5edae164e13dbeed6429c41d";

            const hashedCommitment = await atomicCloak.commitmentToAddress(
                qx,
                qy
            );
            secret =
                "0x1787f38d854231dfec2b27a0f621414d10bfa95970b3e576aed29e1e8287e51e";

            expect(await atomicCloak.getHashedCommitment(secret)).to.equal(
                hashedCommitment
            );
        });

        it("Should generate and verify random commitment", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);

            const secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const hashedCommitment = await atomicCloak.commitmentToAddress(
                qx,
                qy
            );
            // console.log("Secret:", secret);
            // console.log(
            //     "Commitment: (",
            //     qx.toHexString(),
            //     ", ",
            //     qy.toHexString(),
            //     ")"
            // );
            // console.log("Hashed commitment:", hashedCommitment);
            expect(await atomicCloak.getHashedCommitment(secret)).to.equal(
                hashedCommitment
            );
        });

        it("Should generate random commitment and shared commitment and verify both", async function () {
            const { atomicCloak, eccUtils } = await loadFixture(
                deployAtomicCloak
            );

            const secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const hashedCommitment = await atomicCloak.commitmentToAddress(
                qx,
                qy
            );
            // console.log("Secret:", secret);
            // console.log(
            //     "Commitment: (",
            //     qx.toHexString(),
            //     ", ",
            //     qy.toHexString(),
            //     ")"
            // );
            // console.log("Hashed commitment:", hashedCommitment);
            expect(await atomicCloak.getHashedCommitment(secret)).to.equal(
                hashedCommitment
            );

            const sharedSecret = ethers.utils.randomBytes(32);
            const [qsx, qsy] = await atomicCloak.commitmentFromSharedSecret(
                qx,
                qy,
                sharedSecret
            );
            const hashedSharedCommitment =
                await atomicCloak.commitmentToAddress(qsx, qsy);
            // console.log("Shared secret:", sharedSecret);
            // console.log(
            //     "Shared Commitment: (",
            //     qsx.toHexString(),
            //     ", ",
            //     qsy.toHexString(),
            //     ")"
            // );
            // console.log("Hashed shared commitment:", hashedSharedCommitment);

            let modifiedSecret =
                BigInt("0x" + Buffer.from(secret).toString("hex")) +
                BigInt("0x" + Buffer.from(sharedSecret).toString("hex"));
            // console.log("Unsafe modified secret:", modifiedSecret);
            const curveOrder = BigInt(
                "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
            );
            modifiedSecret = modifiedSecret % curveOrder;

            // console.log("Modified secret:", modifiedSecret);

            expect(
                await atomicCloak.getHashedCommitment(modifiedSecret)
            ).to.equal(hashedSharedCommitment);
        });
        it.only("Should generate fixture commitment and shared commitment and verify both", async function () {
            const { atomicCloak, eccUtils } = await loadFixture(
                deployAtomicCloak
            );

            const secret = BigInt(
                "54558739753796538000979871037007719415313302986541501570938489388164508227846"
            );

            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const hashedCommitment = await atomicCloak.commitmentToAddress(
                qx,
                qy
            );

            expect(
                qx.toHexString() ==
                    "0xefa4f741afd1b6efddde9e1e9459a329d25d0e0530e20cb7458255a1dd0d8798"
            ).to.be.true;
            expect(
                qy.toHexString() ==
                    "0x473320a41aac24ee94c53a3fcefe26c80f445553f2f614a49914a00252dc15af"
            ).to.be.true;

            expect(await atomicCloak.getHashedCommitment(secret)).to.equal(
                hashedCommitment
            );
            expect(
                hashedCommitment ==
                    BigInt("0x3878083057e1fda405c91bb11e51edc7df8fc9fd")
            ).to.be.true;
            // ;

            console.log("Hashed commitment:", hashedCommitment);
            // const sharedSecret = ethers.utils.randomBytes(32);
            // const [qsx, qsy] = await atomicCloak.commitmentFromSharedSecret(
            //     qx,
            //     qy,
            //     sharedSecret
            // );
            // const hashedSharedCommitment =
            //     await atomicCloak.commitmentToAddress(qsx, qsy);
            // console.log("Shared secret:", sharedSecret);
            // console.log(
            //     "Shared Commitment: (",
            //     qsx.toHexString(),
            //     ", ",
            //     qsy.toHexString(),
            //     ")"
            // );
            // console.log("Hashed shared commitment:", hashedSharedCommitment);

            // let modifiedSecret =
            //     BigInt("0x" + Buffer.from(secret).toString("hex")) +
            //     BigInt("0x" + Buffer.from(sharedSecret).toString("hex"));
            // // console.log("Unsafe modified secret:", modifiedSecret);
            // const curveOrder = BigInt(
            //     "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
            // );
            // modifiedSecret = modifiedSecret % curveOrder;

            // expect(
            //     await atomicCloak.getHashedCommitment(modifiedSecret)
            // ).to.equal(hashedSharedCommitment);
        });
    });

    describe("Validate user operations", function () {
        it("Should validate signature", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            const secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atomicCloak.openETHSwap(
                    qx,
                    qy,
                    recipient,
                    (await time.latest()) + 10000,
                    {
                        value: ethers.utils.parseUnits("0.1", "ether"),
                    }
                )
            ).not.to.be.reverted;

            const hashedCommitment = await atomicCloak.commitmentToAddress(
                qx,
                qy
            );

            const userOp = {
                sender: ethers.Wallet.createRandom().address,
                nonce: 0,
                initCode: ethers.utils.randomBytes(0),
                callData:
                    "0xe9dd4228" +
                    "000000000000000000000000" +
                    hashedCommitment.slice(2) +
                    Buffer.from(secret).toString("hex") +
                    "0000000000000000000000000000000000000000000000000000000000000000",
                callGasLimit: 0,
                verificationGasLimit: 0,
                preVerificationGas: 0,
                maxFeePerGas: 0,
                maxPriorityFeePerGas: 0,
                paymasterAndData: ethers.utils.randomBytes(0),
                signature: ethers.utils.randomBytes(0),
            };
            const validateTrs =
                await atomicCloak.estimateGas.validateSignature_test(userOp);
            await expect(validateTrs).not.to.be.reverted;
            // const validateReceipt = await validateTrs.wait();
            console.log(
                "Signature validation gas used:",
                validateTrs.toNumber()
            );

            const commitTrs =
                await atomicCloak.estimateGas.commitmentFromSecret(secret);
            console.log("Curve ecmul gas used:", commitTrs.toNumber());

            const ecrecoverTrs =
                await atomicCloak.estimateGas.getHashedCommitment(secret);
            console.log("Ecrecover trick gas used:", ecrecoverTrs.toNumber());
        });

        it("Should fail to validate signature: invalid selector", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            const userOp = {
                sender: ethers.Wallet.createRandom().address,
                nonce: 0,
                initCode: ethers.utils.randomBytes(0),
                callData:
                    "0x185da727" +
                    "000000000000000000000000" +
                    Buffer.from(ethers.utils.randomBytes(20)).toString("hex") +
                    Buffer.from(ethers.utils.randomBytes(32)).toString("hex"),
                callGasLimit: 0,
                verificationGasLimit: 0,
                preVerificationGas: 0,
                maxFeePerGas: 0,
                maxPriorityFeePerGas: 0,
                paymasterAndData: ethers.utils.randomBytes(0),
                signature: ethers.utils.randomBytes(0),
            };
            const validateTrs = await atomicCloak.validateSignature_test(
                userOp
            );

            await expect(validateTrs).to.be.revertedWith("Invalid selector.");
        });
    });

    describe("Closing swaps", function () {
        it("Should open and close a ETH swap", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);

            const sharedSecret = ethers.utils.randomBytes(32);
            const [qsx, qsy] = await atomicCloak.commitmentFromSharedSecret(
                qx,
                qy,
                sharedSecret
            );

            const recipient = ethers.Wallet.createRandom().address;
            const openTrs = await atomicCloak.openETHSwap(
                qsx,
                qsy,
                recipient,
                (await time.latest()) + 10000,
                {
                    value: ethers.utils.parseUnits("0.1", "ether"),
                }
            );

            await expect(openTrs).not.to.be.reverted;
            const openTrsReceipt = await openTrs.wait();
            let gasUsed = openTrsReceipt.gasUsed.toNumber();
            console.log("Gas used:", openTrsReceipt.gasUsed.toNumber());

            const hashedSharedCommitment =
                await atomicCloak.commitmentToAddress(qsx, qsy);

            let modifiedSecret =
                BigInt("0x" + Buffer.from(secret).toString("hex")) +
                BigInt("0x" + Buffer.from(sharedSecret).toString("hex"));
            const curveOrder = BigInt(
                "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
            );
            modifiedSecret = modifiedSecret % curveOrder;

            const closeTrs = await atomicCloak.closeSwap(
                hashedSharedCommitment,
                modifiedSecret
            );

            await expect(closeTrs).not.to.be.reverted;
            const closeTrsReceipt = await closeTrs.wait();
            console.log("Gas used:", closeTrsReceipt.gasUsed.toNumber());
            gasUsed += closeTrsReceipt.gasUsed.toNumber();
            console.log("Total gas used:", gasUsed);
        });

        it("Should fail to close a ETH swap: swap has not been opened", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);

            const sharedSecret = ethers.utils.randomBytes(32);
            const [qsx, qsy] = await atomicCloak.commitmentFromSharedSecret(
                qx,
                qy,
                sharedSecret
            );

            const hashedSharedCommitment =
                await atomicCloak.commitmentToAddress(qsx, qsy);

            let modifiedSecret =
                BigInt("0x" + Buffer.from(secret).toString("hex")) +
                BigInt("0x" + Buffer.from(sharedSecret).toString("hex"));
            const curveOrder = BigInt(
                "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
            );
            modifiedSecret = modifiedSecret % curveOrder;

            await expect(
                atomicCloak.closeSwap(hashedSharedCommitment, modifiedSecret)
            ).to.be.revertedWith("Swap has not been opened.");
        });

        it("Should open and fail close a ETH swap: verification failed", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);

            const sharedSecret = ethers.utils.randomBytes(32);
            const [qsx, qsy] = await atomicCloak.commitmentFromSharedSecret(
                qx,
                qy,
                sharedSecret
            );

            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atomicCloak.openETHSwap(
                    qsx,
                    qsy,
                    recipient,
                    (await time.latest()) + 10000,
                    {
                        value: ethers.utils.parseUnits("0.1", "ether"),
                    }
                )
            ).not.to.be.reverted;
            const hashedSharedCommitment =
                await atomicCloak.commitmentToAddress(qsx, qsy);

            let modifiedSecret =
                BigInt("0x" + Buffer.from(secret).toString("hex")) +
                BigInt("0x" + Buffer.from(sharedSecret).toString("hex")) +
                1n;
            const curveOrder = BigInt(
                "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
            );
            modifiedSecret = modifiedSecret % curveOrder;

            await expect(
                atomicCloak.closeSwap(hashedSharedCommitment, modifiedSecret)
            ).to.be.revertedWith("Verification failed.");
        });
    });

    describe("Redeeming swaps", function () {
        it("Should open and redeem an expired ETH swap", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atomicCloak.openETHSwap(
                    qx,
                    qy,
                    recipient,
                    (await time.latest()) + 12,
                    {
                        value: ethers.utils.parseUnits("0.1", "ether"),
                    }
                )
            ).not.to.be.reverted;

            const hashedCommitment = await atomicCloak.commitmentToAddress(
                qx,
                qy
            );
            const delay = (ms) =>
                new Promise((resolve) => setTimeout(resolve, ms));
            await delay(12000);
            await expect(atomicCloak.redeemExpiredSwap(hashedCommitment)).not.to
                .be.reverted;
        });

        it("Should fail to redeem an ETH swap: swap has not expired", async function () {
            const { atomicCloak } = await loadFixture(deployAtomicCloak);
            secret = ethers.utils.randomBytes(32);
            const [qx, qy] = await atomicCloak.commitmentFromSecret(secret);
            const recipient = ethers.Wallet.createRandom().address;

            await expect(
                atomicCloak.openETHSwap(
                    qx,
                    qy,
                    recipient,
                    (await time.latest()) + 10000,
                    {
                        value: ethers.utils.parseUnits("0.1", "ether"),
                    }
                )
            ).not.to.be.reverted;
            const hashedCommitment = await atomicCloak.commitmentToAddress(
                qx,
                qy
            );
            await expect(
                atomicCloak.redeemExpiredSwap(hashedCommitment)
            ).to.be.revertedWith("Swap has not expired.");
        });
    });

    describe("Events", function () {
        // it("Should emit an event on withdrawals", async function () {
        //     const { lock, unlockTime, lockedAmount } = await loadFixture(
        //         deployOneYearLockFixture
        //     );
        //     await time.increaseTo(unlockTime);
        //     await expect(lock.withdraw())
        //         .to.emit(lock, "Withdrawal")
        //         .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
        // });
    });
});
