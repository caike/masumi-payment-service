import { PaymentAction, TransactionStatus, PaymentErrorType } from "@prisma/client";
import { Sema } from "async-sema";
import { prisma } from '@/utils/db';
import { BlockfrostProvider, Data, SLOT_CONFIG_NETWORK, Transaction, mBool, unixTimeToEnclosingSlot } from "@meshsdk/core";
import { logger } from "@/utils/logger";
import * as cbor from "cbor";
import { getPaymentScriptFromPaymentSourceV1, getSmartContractStateDatum, SmartContractState } from "@/utils/generator/contract-generator";
import { convertNetwork, } from "@/utils/converter/network-convert";
import { generateWalletExtended } from "@/utils/generator/wallet-generator";
import { decodeV1ContractDatum } from "@/utils/converter/string-datum-convert";
import { lockAndQueryPayments } from "@/utils/db/lock-and-query-payments";
import { convertErrorString } from "@/utils/converter/error-string-convert";
import { delayErrorResolver } from "advanced-retry";
import { advancedRetryAll } from "advanced-retry";

const updateMutex = new Sema(1);

export async function submitResultV1() {

    const acquiredMutex = await updateMutex.tryAcquire();
    //if we are already performing an update, we wait for it to finish and return
    if (!acquiredMutex)
        return await updateMutex.acquire();

    try {
        //Submit a result for invalid tokens
        const paymentContractsWithWalletLocked = await lockAndQueryPayments(
            {
                paymentStatus: PaymentAction.SubmitResultRequested,
                submitResultTime: {
                    gte: Date.now() + 1000 * 60 * 1 //remove 1 minute for block time
                },
                requestedResultHash: { not: null },
            }
        )

        await Promise.allSettled(paymentContractsWithWalletLocked.map(async (paymentContract) => {

            if (paymentContract.PaymentRequests.length == 0)
                return;

            const network = convertNetwork(paymentContract.network)

            const blockchainProvider = new BlockfrostProvider(paymentContract.PaymentSourceConfig.rpcProviderApiKey);

            const paymentRequests = paymentContract.PaymentRequests;
            if (paymentRequests.length == 0)
                return;

            const results = await advancedRetryAll({
                errorResolvers: [delayErrorResolver({ configuration: { maxRetries: 5, backoffMultiplier: 5, initialDelayMs: 500, maxDelayMs: 7500 } })],
                operations: paymentRequests.map((request) => async () => {

                    const { wallet, utxos, address } = await generateWalletExtended(paymentContract.network, paymentContract.PaymentSourceConfig.rpcProviderApiKey, request.SmartContractWallet!.Secret.encryptedMnemonic)

                    if (utxos.length === 0) {
                        //this is if the seller wallet is empty
                        throw new Error('No UTXOs found in the wallet. Wallet is empty.');
                    }

                    const { script, smartContractAddress } = await getPaymentScriptFromPaymentSourceV1(paymentContract)
                    const txHash = request.CurrentTransaction?.txHash;
                    if (txHash == null) {
                        throw new Error('No transaction hash found');
                    }
                    const utxoByHash = await blockchainProvider.fetchUTxOs(
                        txHash,
                    );

                    const utxo = utxoByHash.find((utxo) => utxo.input.txHash == txHash);

                    if (!utxo) {
                        throw new Error('UTXO not found');
                    }


                    const buyerVerificationKeyHash = request.BuyerWallet!.walletVkey;
                    const sellerVerificationKeyHash = request.SmartContractWallet!.walletVkey;

                    const utxoDatum = utxo.output.plutusData;
                    if (!utxoDatum) {
                        throw new Error('No datum found in UTXO');
                    }

                    const decodedDatum = cbor.decode(Buffer.from(utxoDatum, 'hex'));
                    const decodedContract = decodeV1ContractDatum(decodedDatum)
                    if (decodedContract == null) {
                        throw new Error('Invalid datum');
                    }

                    const datum = {
                        value: {
                            alternative: 0,
                            fields: [
                                Buffer.from(buyerVerificationKeyHash).toString("hex"),
                                Buffer.from(sellerVerificationKeyHash).toString("hex"),
                                Buffer.from(request.blockchainIdentifier).toString("hex"),
                                Buffer.from(request.NextAction.resultHash ?? "").toString("hex"),
                                decodedContract.resultTime,
                                decodedContract.unlockTime,
                                decodedContract.refundTime,
                                //is converted to false
                                mBool(decodedContract.refundRequested),
                                decodedContract.newCooldownTime,
                                0,
                                getSmartContractStateDatum(decodedContract.refundRequested ? SmartContractState.Disputed : SmartContractState.ResultSubmitted),
                            ],
                        } as Data,
                        inline: true,
                    };

                    const redeemer = {
                        data: {
                            alternative: 4,
                            fields: [],
                        },
                    };
                    const invalidBefore =
                        unixTimeToEnclosingSlot(Date.now() - 150000, SLOT_CONFIG_NETWORK[network]) - 1;

                    const invalidAfter =
                        unixTimeToEnclosingSlot(Date.now() + 150000, SLOT_CONFIG_NETWORK[network]) + 1;

                    const unsignedTx = new Transaction({ initiator: wallet }).setMetadata(674, {
                        msg: ["Masumi", "SubmitResult"],
                    })
                        .redeemValue({
                            value: utxo,
                            script: script,
                            redeemer: redeemer,
                        })
                        .sendAssets(
                            {
                                address: smartContractAddress,
                                datum: datum,
                            },
                            utxo.output.amount
                        )
                        //send to remaining amount the original purchasing wallet
                        .setChangeAddress(address)
                        .setRequiredSigners([address]);

                    unsignedTx.txBuilder.invalidBefore(invalidBefore);
                    unsignedTx.txBuilder.invalidHereafter(invalidAfter);

                    const buildTransaction = await unsignedTx.build();
                    const signedTx = await wallet.signTx(buildTransaction);

                    await prisma.paymentRequest.update({
                        where: { id: request.id }, data: {
                            NextAction: {
                                update: {
                                    requestedAction: PaymentAction.SubmitResultInitiated,
                                }
                            },
                        }
                    })
                    //submit the transaction to the blockchain
                    const newTxHash = await wallet.submitTx(signedTx);
                    await prisma.paymentRequest.update({
                        where: { id: request.id }, data: {
                            CurrentTransaction: {
                                create: {
                                    txHash: newTxHash,
                                    status: TransactionStatus.Pending,
                                    BlocksWallet: {
                                        connect: {
                                            id: request.SmartContractWallet!.id
                                        }
                                    }
                                }
                            },
                            TransactionHistory: {
                                connect: {
                                    id: request.CurrentTransaction!.id
                                }
                            }
                        }
                    })

                    logger.info(`Created withdrawal transaction:
                  Tx ID: ${txHash}
                  View (after a bit) on https://${network === 'preprod'
                            ? 'preprod.'
                            : ''
                        }cardanoscan.io/transaction/${txHash}
                  Smart Contract Address: ${smartContractAddress}
              `);
                    return true;
                })
            })
            let index = 0;
            for (const result of results) {
                const request = paymentRequests[index];
                if (result.success == false || result.result != true) {
                    const error = result.error;
                    logger.error(`Error submitting result`, { error: error });
                    await prisma.paymentRequest.update({
                        where: { id: request.id }, data: {
                            NextAction: {
                                update: {
                                    requestedAction: PaymentAction.WaitingForManualAction,
                                    errorType: PaymentErrorType.Unknown,
                                    errorNote: "Submitting result failed: " + convertErrorString(error),
                                }
                            },
                            SmartContractWallet: {
                                update: {
                                    lockedAt: null
                                }
                            }
                        }
                    })
                }
                index++;
            }
        }))
    }
    catch (error) {
        logger.error("Error submitting result", { error: error })
    }
    finally {
        //library is strange as we can release from any non-acquired semaphore
        updateMutex.release()
    }
}

export const cardanoSubmitResultHandlerService = { submitResultV1 }
