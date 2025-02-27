import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { healthResponseSchema } from '@/routes/api/health';
import {
  addAPIKeySchemaInput,
  addAPIKeySchemaOutput,
  deleteAPIKeySchemaInput,
  deleteAPIKeySchemaOutput,
  getAPIKeySchemaInput,
  getAPIKeySchemaOutput,
  updateAPIKeySchemaInput,
  updateAPIKeySchemaOutput,
} from '@/routes/api/api-key';
import {
  createPaymentSchemaOutput,
  createPaymentsSchemaInput,
  queryPaymentsSchemaInput,
  queryPaymentsSchemaOutput,
} from '@/routes/api/payments';
import {
  createPurchaseInitSchemaInput,
  createPurchaseInitSchemaOutput,
  queryPurchaseRequestSchemaInput,
  queryPurchaseRequestSchemaOutput,
} from '@/routes/api/purchases';
import {
  queryRegistryRequestSchemaInput,
  queryRegistryRequestSchemaOutput,
  registerAgentSchemaInput,
  registerAgentSchemaOutput,
  unregisterAgentSchemaInput,
  unregisterAgentSchemaOutput,
} from '@/routes/api/registry';
import { getAPIKeyStatusSchemaOutput } from '@/routes/api/api-key-status';
import {
  getWalletSchemaInput,
  getWalletSchemaOutput,
  postWalletSchemaInput,
  postWalletSchemaOutput,
} from '@/routes/api/wallet';
import {
  getRpcProviderKeysSchemaInput,
  getRpcProviderKeysSchemaOutput,
} from '@/routes/api/rpc-api-keys';
import { getUTXOSchemaInput, getUTXOSchemaOutput } from '@/routes/api/utxos';
import {
  paymentSourceSchemaInput,
  paymentSourceSchemaOutput,
} from '@/routes/api/payment-source';
import {
  Network,
  PaymentType,
  PurchasingAction,
  PaymentAction,
  Permission,
  ApiKeyStatus,
  RPCProvider,
} from '@prisma/client';
import {
  authorizePaymentRefundSchemaInput,
  authorizePaymentRefundSchemaOutput,
} from '@/routes/api/payments/authorize-refund';
import {
  submitPaymentResultSchemaInput,
  submitPaymentResultSchemaOutput,
} from '@/routes/api/payments/submit-result';
import {
  requestPurchaseRefundSchemaInput,
  requestPurchaseRefundSchemaOutput,
} from '@/routes/api/purchases/request-refund';
import {
  cancelPurchaseRefundRequestSchemaInput,
  cancelPurchaseRefundRequestSchemaOutput,
} from '@/routes/api/purchases/cancel-refund-request';
import {
  paymentSourceExtendedCreateSchemaInput,
  paymentSourceExtendedCreateSchemaOutput,
  paymentSourceExtendedDeleteSchemaInput,
  paymentSourceExtendedDeleteSchemaOutput,
  paymentSourceExtendedSchemaInput,
  paymentSourceExtendedSchemaOutput,
  paymentSourceExtendedUpdateSchemaInput,
  paymentSourceExtendedUpdateSchemaOutput,
} from '@/routes/api/payment-source-extended';
import {
  queryAgentFromWalletSchemaInput,
  queryAgentFromWalletSchemaOutput,
} from '@/routes/api/registry/wallet';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
export function generateOpenAPI() {
  /********************* HEALTH *****************************/
  registry.registerPath({
    method: 'get',
    path: '/health/',
    tags: ['health'],
    summary: 'Get the status of the API server',
    request: {},
    responses: {
      200: {
        description: 'Object with status ok, if the server is running',
        content: {
          'application/json': {
            schema: healthResponseSchema.openapi({ example: { status: 'ok' } }),
          },
        },
      },
    },
  });

  const apiKeyAuth = registry.registerComponent('securitySchemes', 'API-Key', {
    type: 'apiKey',
    in: 'header',
    name: 'token',
    description: 'API key authentication via header (token)',
  });

  /********************* KEY STATUS *****************************/
  registry.registerPath({
    method: 'get',
    path: '/api-key-status/',
    description: 'Gets api key status',
    summary: 'REQUIRES API KEY Authentication (+READ)',
    tags: ['api-key'],
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'API key status',
        content: {
          'application/json': {
            schema: z
              .object({ status: z.string(), data: getAPIKeyStatusSchemaOutput })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    status: ApiKeyStatus.Active,
                    token: 'masumi_payment_api_key_secret',
                    permission: Permission.Admin,
                    networkLimit: [Network.Preprod],
                    usageLimited: true,
                    RemainingUsageCredits: [
                      { unit: 'lovelace', amount: '10000000' },
                    ],
                  },
                },
              }),
          },
        },
      },
    },
  });

  /********************* WALLET *****************************/
  registry.registerPath({
    method: 'get',
    path: '/wallet/',
    description: 'Gets wallet status',
    summary: 'REQUIRES API KEY Authentication (+ADMIN)',
    tags: ['wallet'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      query: getWalletSchemaInput.openapi({
        example: {
          id: 'unique_cuid_v2_of_entry_to_delete',
          includeSecret: 'true',
          walletType: 'Selling',
        },
      }),
    },
    responses: {
      200: {
        description: 'Wallet status',
        content: {
          'application/json': {
            schema: z
              .object({ status: z.string(), data: getWalletSchemaOutput })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    walletVkey: 'wallet_vkey',
                    note: 'note',
                    PendingTransaction: null,
                    walletAddress: 'wallet_address',
                    Secret: {
                      createdAt: new Date(1713636260),
                      updatedAt: new Date(1713636260),
                      mnemonic: 'decoded_secret',
                    },
                  },
                },
              }),
          },
        },
      },
    },
  });
  registry.registerPath({
    method: 'post',
    path: '/wallet/',
    description:
      'Creates a wallet, it will not be saved in the database, please ensure to remember the mnemonic',
    summary: 'REQUIRES API KEY Authentication (+ADMIN)',
    tags: ['wallet'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: postWalletSchemaInput.openapi({
              example: {
                network: Network.Preprod,
              },
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Wallet created',
        content: {
          'application/json': {
            schema: postWalletSchemaOutput.openapi({
              example: {
                walletMnemonic: 'wallet_mnemonic',
                walletAddress: 'wallet_address',
                walletVkey: 'wallet_vkey',
              },
            }),
          },
        },
      },
    },
  });
  /********************* API KEYS *****************************/
  registry.registerPath({
    method: 'get',
    path: '/api-key/',
    description: 'Gets api key status',
    summary: 'REQUIRES API KEY Authentication (+admin)',
    tags: ['api-key'],
    request: {
      query: getAPIKeySchemaInput.openapi({
        example: {
          limit: 10,
          cursorApiKey: 'identifier',
        },
      }),
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'Api key status',
        content: {
          'application/json': {
            schema: z
              .object({ status: z.string(), data: getAPIKeySchemaOutput })
              .openapi({
                example: {
                  data: {
                    apiKeys: [
                      {
                        token: 'masumi_payment_api_key_secret',
                        permission: Permission.Admin,
                        usageLimited: true,
                        RemainingUsageCredits: [
                          { unit: 'lovelace', amount: '10000000' },
                        ],
                        status: ApiKeyStatus.Active,
                        networkLimit: [Network.Mainnet],
                      },
                    ],
                  },
                  status: 'success',
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api-key/',
    description: 'Creates a API key',
    summary: 'REQUIRES API KEY Authentication (+admin)',
    tags: ['api-key'],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: addAPIKeySchemaInput.openapi({
              example: {
                usageLimited: 'true',
                UsageCredits: [{ unit: 'lovelace', amount: '10000000' }],
                permission: Permission.Admin,
              },
            }),
          },
        },
      },
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'API key deleted',
        content: {
          'application/json': {
            schema: z
              .object({ data: addAPIKeySchemaOutput, status: z.string() })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'unique_cuid_v2_of_entry_to_delete',
                    token: 'masumi_payment_api_key_secret',
                    permission: Permission.Admin,
                    usageLimited: true,
                    networkLimit: [Network.Preprod],
                    status: ApiKeyStatus.Active,
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api-key/',
    description: 'Creates a API key',
    summary: 'REQUIRES API KEY Authentication (+admin)',
    tags: ['api-key'],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: updateAPIKeySchemaInput.openapi({
              example: {
                id: 'id_or_apiKey_unique_cuid_v2_of_entry_to_update',
                token: 'id_or_apiKey_api_key_to_update',
                UsageCredits: [{ unit: 'lovelace', amount: '10000000' }],
                status: ApiKeyStatus.Active,
              },
            }),
          },
        },
      },
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'API key deleted',
        content: {
          'application/json': {
            schema: z
              .object({ data: updateAPIKeySchemaOutput, status: z.string() })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'unique_cuid_v2_of_entry_to_delete',
                    token: 'masumi_payment_api_key_secret',
                    permission: Permission.Admin,
                    usageLimited: true,
                    networkLimit: [Network.Preprod, Network.Mainnet],
                    status: ApiKeyStatus.Active,
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api-key/',
    description: 'Removes a API key',
    summary: 'REQUIRES API KEY Authentication (+admin)',
    tags: ['api-key'],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: deleteAPIKeySchemaInput.openapi({
              example: {
                id: 'id_or_apiKey_unique_cuid_v2_of_entry_to_delete',
                token: 'id_or_apiKey_api_key_to_delete',
              },
            }),
          },
        },
      },
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'API key deleted',
        content: {
          'application/json': {
            schema: z
              .object({ data: deleteAPIKeySchemaOutput, status: z.string() })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'unique_cuid_v2_of_entry_to_delete',
                    token: 'masumi_registry_api_key_secret',
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });

  /********************* PAYMENT *****************************/
  registry.registerPath({
    method: 'get',
    path: '/payment/',
    description:
      'Gets the payment status. It needs to be created first with a POST request.',
    summary: 'REQUIRES API KEY Authentication (+READ)',
    tags: ['payment'],
    request: {
      query: queryPaymentsSchemaInput.openapi({
        example: {
          limit: 10,
          cursorId: 'cuid_v2_of_last_cursor_entry',
          network: Network.Preprod,
          smartContractAddress: 'addr_abcd1234567890',
        },
      }),
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'Payment status',
        content: {
          'application/json': {
            schema: z
              .object({ status: z.string(), data: queryPaymentsSchemaOutput })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    payments: [
                      {
                        id: 'cuid_v2_auto_generated',
                        blockchainIdentifier: 'blockchain_identifier',
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        submitResultTime: '0',
                        unlockTime: '0',
                        externalDisputeUnlockTime: '0',
                        lastCheckedAt: null,
                        cooldownTime: 0,
                        cooldownTimeOtherParty: 0,
                        requestedById: 'requester_id',
                        resultHash: 'result_hash',
                        onChainState: null,
                        NextAction: {
                          requestedAction:
                            PaymentAction.AuthorizeRefundRequested,
                          errorType: null,
                          errorNote: null,
                        },
                        CurrentTransaction: null,
                        TransactionHistory: [],
                        Amounts: [
                          {
                            id: 'amount_id',
                            createdAt: new Date(1713636260),
                            updatedAt: new Date(1713636260),
                            amount: '10000000',
                            unit: 'lovelace',
                          },
                        ],
                        PaymentSource: {
                          id: 'payment_source_id',
                          network: Network.Preprod,
                          smartContractAddress: 'address',
                          paymentType: PaymentType.Web3CardanoV1,
                        },
                        BuyerWallet: null,
                        SmartContractWallet: null,
                        metadata: null,
                      },
                    ],
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/payment/',
    description:
      'Creates a payment request and identifier. This will check incoming payments in the background.',
    summary: 'REQUIRES API KEY Authentication (+PAY)',
    tags: ['payment'],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: createPaymentsSchemaInput.openapi({
              example: {
                agentIdentifier: 'agent_identifier',
                network: Network.Preprod,
                metadata:
                  '(private) metadata to be stored with the payment request',
                smartContractAddress: 'address',
                amounts: [{ amount: '10000000', unit: 'lovelace' }],
                paymentType: PaymentType.Web3CardanoV1,
                submitResultTime: new Date(1713636260).toISOString(),
                identifierFromPurchaser: 'unique_key_from_purchaser',
              },
            }),
          },
        },
      },
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'Payment request created',
        content: {
          'application/json': {
            schema: z
              .object({ data: createPaymentSchemaOutput, status: z.string() })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'cuid_v2_auto_generated',
                    blockchainIdentifier: 'blockchain_identifier',
                    createdAt: new Date(1713636260),
                    updatedAt: new Date(1713636260),
                    submitResultTime: '0',
                    unlockTime: '0',
                    externalDisputeUnlockTime: '0',
                    lastCheckedAt: null,
                    requestedById: 'requester_id',
                    resultHash: 'result_hash',
                    onChainState: null,
                    NextAction: {
                      requestedAction: PaymentAction.AuthorizeRefundRequested,
                      errorType: null,
                      errorNote: null,
                    },
                    Amounts: [
                      {
                        id: 'amount_id',
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        amount: '10000000',
                        unit: 'lovelace',
                      },
                    ],
                    PaymentSource: {
                      id: 'payment_source_id',
                      network: Network.Preprod,
                      smartContractAddress: 'address',
                      paymentType: PaymentType.Web3CardanoV1,
                    },
                    BuyerWallet: null,
                    SmartContractWallet: null,
                    metadata: null,
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/payment/submit-result',
    description:
      'Completes a payment request. This will collect the funds after the unlock time.',
    summary: 'REQUIRES API KEY Authentication (+PAY)',
    tags: ['payment'],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: submitPaymentResultSchemaInput.openapi({
              example: {
                network: Network.Preprod,
                smartContractAddress: 'address',
                blockchainIdentifier: 'identifier',
                submitResultHash: 'hash',
              },
            }),
          },
        },
      },
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'Payment updated',
        content: {
          'application/json': {
            schema: z
              .object({
                data: submitPaymentResultSchemaOutput,
                status: z.string(),
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'cuid_v2_auto_generated',
                    blockchainIdentifier: 'blockchain_identifier',
                    createdAt: new Date(1713636260),
                    updatedAt: new Date(1713636260),
                    submitResultTime: '0',
                    unlockTime: '0',
                    externalDisputeUnlockTime: '0',
                    lastCheckedAt: null,
                    requestedById: 'requester_id',
                    resultHash: 'result_hash',
                    onChainState: null,
                    NextAction: {
                      requestedAction: PaymentAction.AuthorizeRefundRequested,
                      errorType: null,
                      errorNote: null,
                    },
                    Amounts: [
                      {
                        id: 'amount_id',
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        amount: '10000000',
                        unit: 'lovelace',
                      },
                    ],
                    PaymentSource: {
                      id: 'payment_source_id',
                      network: Network.Preprod,
                      smartContractAddress: 'address',
                      paymentType: PaymentType.Web3CardanoV1,
                    },
                    BuyerWallet: null,
                    SmartContractWallet: null,
                    metadata: null,
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });
  registry.registerPath({
    method: 'post',
    path: '/payment/authorize-refund',
    description:
      'Authorizes a refund for a payment request. This will stop the right to receive a payment and initiate a refund for the other party.',
    summary: 'REQUIRES API KEY Authentication (+PAY)',
    tags: ['payment'],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: authorizePaymentRefundSchemaInput.openapi({
              example: {
                network: Network.Preprod,
                paymentContractAddress: 'address',
                blockchainIdentifier: 'blockchain_identifier',
              },
            }),
          },
        },
      },
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'API key deleted',
        content: {
          'application/json': {
            schema: z
              .object({
                data: authorizePaymentRefundSchemaOutput,
                status: z.string(),
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'cuid_v2_auto_generated',
                    blockchainIdentifier: 'blockchain_identifier',
                    createdAt: new Date(1713636260),
                    updatedAt: new Date(1713636260),
                    submitResultTime: '0',
                    unlockTime: '0',
                    externalDisputeUnlockTime: '0',
                    lastCheckedAt: null,
                    requestedById: 'requester_id',
                    resultHash: 'result_hash',
                    onChainState: null,
                    NextAction: {
                      requestedAction: PaymentAction.AuthorizeRefundRequested,
                      errorType: null,
                      errorNote: null,
                    },
                    Amounts: [
                      {
                        id: 'amount_id',
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        amount: '10000000',
                        unit: 'lovelace',
                      },
                    ],
                    PaymentSource: {
                      id: 'payment_source_id',
                      network: Network.Preprod,
                      smartContractAddress: 'address',
                      paymentType: PaymentType.Web3CardanoV1,
                    },
                    BuyerWallet: null,
                    SmartContractWallet: null,
                    metadata: null,
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });

  /********************* PURCHASE *****************************/
  registry.registerPath({
    method: 'get',
    path: '/purchase/',
    description:
      'Gets the purchase status. It needs to be created first with a POST request.',
    summary: 'REQUIRES API KEY Authentication (+READ)',
    tags: ['purchase'],
    request: {
      query: queryPurchaseRequestSchemaInput.openapi({
        example: {
          limit: 10,
          cursorId: 'cuid_v2_of_last_cursor_entry',
          network: Network.Preprod,
          smartContractAddress: 'addr_abcd1234567890',
        },
      }),
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'Purchase status',
        content: {
          'application/json': {
            schema: z
              .object({
                status: z.string(),
                data: queryPurchaseRequestSchemaOutput,
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    purchases: [
                      {
                        id: 'cuid_v2_auto_generated',
                        blockchainIdentifier: 'blockchain_identifier',
                        lastCheckedAt: null,
                        onChainState: null,
                        metadata: null,
                        requestedById: 'requester_id',
                        resultHash: '',
                        cooldownTime: 0,
                        cooldownTimeOtherParty: 0,
                        NextAction: {
                          requestedAction:
                            PurchasingAction.FundsLockingRequested,
                          errorType: null,
                          errorNote: null,
                        },
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        externalDisputeUnlockTime: (1713636260).toString(),
                        submitResultTime: new Date(1713636260).toISOString(),
                        unlockTime: (1713636260).toString(),
                        Amounts: [],
                        PaymentSource: {
                          id: 'payment_source_id',
                          network: Network.Preprod,
                          smartContractAddress: 'address',
                          paymentType: PaymentType.Web3CardanoV1,
                        },
                        SellerWallet: null,
                        SmartContractWallet: null,
                        CurrentTransaction: null,
                        TransactionHistory: [],
                      },
                    ],
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/purchase/',
    description:
      'Creates a purchase and pays the seller. This requires funds to be available.',
    summary: 'REQUIRES API KEY Authentication (+PAY)',
    tags: ['purchase'],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: createPurchaseInitSchemaInput.openapi({
              example: {
                identifierFromPurchaser: 'cuid_v2_send_to_seller',
                blockchainIdentifier: 'blockchain_identifier',
                network: Network.Preprod,
                sellerVkey: 'seller_vkey',
                smartContractAddress: 'address',
                amounts: [{ amount: '10000000', unit: 'lovelace' }],
                paymentType: PaymentType.Web3CardanoV1,
                submitResultTime: (1713636260).toString(),
                unlockTime: (1713636260).toString(),
                externalDisputeUnlockTime: (1713636260).toString(),
                agentIdentifier: 'agent_identifier',
              },
            }),
          },
        },
      },
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'Purchase request created',
        content: {
          'application/json': {
            schema: z
              .object({
                data: createPurchaseInitSchemaOutput,
                status: z.string(),
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'cuid_v2_auto_generated',
                    createdAt: new Date(1713636260),
                    updatedAt: new Date(1713636260),
                    blockchainIdentifier: 'blockchain_identifier',
                    lastCheckedAt: null,
                    submitResultTime: '0',
                    unlockTime: '0',
                    externalDisputeUnlockTime: '0',
                    requestedById: 'requester_id',
                    resultHash: '',
                    onChainState: null,
                    NextAction: {
                      requestedAction: PurchasingAction.FundsLockingRequested,
                      errorType: null,
                      errorNote: null,
                    },
                    CurrentTransaction: null,
                    Amounts: [
                      {
                        id: 'amount_id',
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        amount: '10000000',
                        unit: 'lovelace',
                      },
                    ],
                    PaymentSource: {
                      id: 'payment_source_id',
                      network: Network.Preprod,
                      smartContractAddress: 'address',
                      paymentType: PaymentType.Web3CardanoV1,
                    },
                    SellerWallet: null,
                    SmartContractWallet: null,
                    metadata: null,
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/purchase/request-refund',
    description:
      'Requests a refund for a completed purchase. This will collect the refund after the refund time.',
    summary: 'REQUIRES API KEY Authentication (+PAY)',
    tags: ['purchase'],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: requestPurchaseRefundSchemaInput.openapi({
              example: {
                network: Network.Preprod,
                smartContractAddress: 'address',
                blockchainIdentifier: 'blockchain_identifier',
              },
            }),
          },
        },
      },
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'API key deleted',
        content: {
          'application/json': {
            schema: z
              .object({
                data: requestPurchaseRefundSchemaOutput,
                status: z.string(),
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'cuid_v2_auto_generated',
                    createdAt: new Date(1713636260),
                    updatedAt: new Date(1713636260),
                    blockchainIdentifier: 'blockchain_identifier',
                    lastCheckedAt: null,
                    submitResultTime: '0',
                    unlockTime: '0',
                    externalDisputeUnlockTime: '0',
                    requestedById: 'requester_id',
                    resultHash: '',
                    onChainState: null,
                    NextAction: {
                      requestedAction: PurchasingAction.FundsLockingRequested,
                      errorType: null,
                      errorNote: null,
                    },
                    CurrentTransaction: null,
                    Amounts: [
                      {
                        id: 'amount_id',
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        amount: '10000000',
                        unit: 'lovelace',
                      },
                    ],
                    PaymentSource: {
                      id: 'payment_source_id',
                      network: Network.Preprod,
                      smartContractAddress: 'address',
                      paymentType: PaymentType.Web3CardanoV1,
                    },
                    SellerWallet: null,
                    SmartContractWallet: null,
                    metadata: null,
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });
  registry.registerPath({
    method: 'post',
    path: '/purchase/cancel-refund-request',
    description:
      'Requests a refund for a completed purchase. This will collect the refund after the refund time.',
    summary: 'REQUIRES API KEY Authentication (+PAY)',
    tags: ['purchase'],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: cancelPurchaseRefundRequestSchemaInput.openapi({
              example: {
                network: Network.Preprod,
                smartContractAddress: 'address',
                blockchainIdentifier: 'blockchain_identifier',
              },
            }),
          },
        },
      },
    },
    security: [{ [apiKeyAuth.name]: [] }],
    responses: {
      200: {
        description: 'API key deleted',
        content: {
          'application/json': {
            schema: z
              .object({
                data: cancelPurchaseRefundRequestSchemaOutput,
                status: z.string(),
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'cuid_v2_auto_generated',
                    createdAt: new Date(1713636260),
                    updatedAt: new Date(1713636260),
                    blockchainIdentifier: 'blockchain_identifier',
                    lastCheckedAt: null,
                    submitResultTime: '0',
                    unlockTime: '0',
                    externalDisputeUnlockTime: '0',
                    requestedById: 'requester_id',
                    resultHash: '',
                    onChainState: null,
                    NextAction: {
                      requestedAction: PurchasingAction.FundsLockingRequested,
                      errorType: null,
                      errorNote: null,
                    },
                    CurrentTransaction: null,
                    Amounts: [
                      {
                        id: 'amount_id',
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        amount: '10000000',
                        unit: 'lovelace',
                      },
                    ],
                    PaymentSource: {
                      id: 'payment_source_id',
                      network: Network.Preprod,
                      smartContractAddress: 'address',
                      paymentType: PaymentType.Web3CardanoV1,
                    },
                    SellerWallet: null,
                    SmartContractWallet: null,
                    metadata: null,
                  },
                },
              }),
          },
        },
      },
      400: {
        description: 'Bad Request (possible parameters missing or invalid)',
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  });
  /********************* REGISTRY *****************************/

  registry.registerPath({
    method: 'get',
    path: '/registry/wallet',
    description: 'Gets the agent metadata.',
    summary: 'REQUIRES API KEY Authentication (+READ)',
    tags: ['registry'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      query: queryAgentFromWalletSchemaInput.openapi({
        example: {
          walletVKey: 'wallet_vkey',
          network: Network.Preprod,
          smartContractAddress: 'address',
        },
      }),
    },
    responses: {
      200: {
        description: 'Agent metadata',
        content: {
          'application/json': {
            schema: z
              .object({
                status: z.string(),
                data: queryAgentFromWalletSchemaOutput,
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    assets: [
                      {
                        policyId: 'policy_id',
                        assetName: 'asset_name',
                        agentIdentifier: 'agent_identifier',
                        metadata: {
                          name: 'name',
                          description: 'description',
                          apiUrl: 'api_url',
                          exampleOutput: 'example_output',
                          tags: ['tag1', 'tag2'],
                          capability: {
                            name: 'capability_name',
                            version: 'capability_version',
                          },
                          author: {
                            name: 'author_name',
                            contact: 'author_contact',
                            organization: 'author_organization',
                          },
                          legal: {
                            privacyPolicy: 'privacy_policy',
                            terms: 'terms',
                            other: 'other',
                          },
                          image: 'image',
                          pricing: [
                            {
                              quantity: 1000000,
                              unit: 'unit',
                            },
                          ],
                          metadataVersion: 1,
                        },
                      },
                    ],
                  },
                },
              }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/registry/',
    description: 'Gets the agent metadata.',
    summary: 'REQUIRES API KEY Authentication (+READ)',
    tags: ['registry'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      query: queryRegistryRequestSchemaInput.openapi({
        example: {
          network: Network.Preprod,
          cursorId: 'cursor_id',
          smartContractAddress: 'address',
        },
      }),
    },
    responses: {
      200: {
        description: 'Agent metadata',
        content: {
          'application/json': {
            schema: z
              .object({
                status: z.string(),
                data: queryRegistryRequestSchemaOutput,
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    assets: [
                      {
                        id: 'asset_id',
                        name: 'name',
                        description: 'description',
                        apiUrl: 'api_url',
                        capabilityName: 'capability_name',
                        capabilityVersion: 'capability_version',
                        requestsPerHour: '100',
                        authorName: 'author_name',
                        authorContact: 'author_contact',
                        authorOrganization: 'author_organization',
                        privacyPolicy: 'link to privacy policy',
                        terms: 'link to terms',
                        other: 'link to other',
                        state: 'RegistrationRequested',
                        tags: ['tag1', 'tag2'],
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        lastCheckedAt: new Date(1713636260),
                        agentIdentifier: 'agent_identifier',
                        Pricing: [
                          {
                            unit: 'unit',
                            quantity: '1000000',
                          },
                        ],
                        SmartContractWallet: {
                          walletVkey: 'wallet_vkey',
                          walletAddress: 'wallet_address',
                        },
                        CurrentTransaction: null,
                      },
                    ],
                  },
                },
              }),
          },
        },
      },
    },
  });
  registry.registerPath({
    method: 'post',
    path: '/registry/',
    description:
      'Registers an agent to the registry (Please note that while it it is put on-chain, the transaction is not yet finalized by the blockchain, as designed finality is only eventually reached. If you need certainty, please check status via the registry(GET) or if you require custom logic, the transaction directly using the txHash)',
    summary: 'REQUIRES API KEY Authentication (+PAY)',
    tags: ['registry'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: registerAgentSchemaInput.openapi({
              example: {
                network: Network.Preprod,
                smartContractAddress: 'addr_test1',
                exampleOutput: 'example_output',
                tags: ['tag1', 'tag2'],
                name: 'Agent Name',
                apiUrl: 'https://api.example.com',
                description: 'Agent Description',
                author: {
                  name: 'Author Name',
                  contact: 'author@example.com',
                  organization: 'Author Organization',
                },
                legal: {
                  privacyPolicy: 'Privacy Policy URL',
                  terms: 'Terms of Service URL',
                  other: 'Other Legal Information URL',
                },
                sellingWalletVkey: 'wallet_vkey',
                capability: { name: 'Capability Name', version: '1.0.0' },
                requestsPerHour: '100',
                pricing: [
                  {
                    unit: 'usdm',
                    quantity: '500000000',
                  },
                ],
              },
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Agent registered',
        content: {
          'application/json': {
            schema: z
              .object({ status: z.string(), data: registerAgentSchemaOutput })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'cuid2',
                    apiUrl: 'api_url',
                    tags: ['tag1', 'tag2'],
                    capabilityName: 'capability_name',
                    capabilityVersion: 'capability_version',
                    requestsPerHour: '100',
                    Pricing: [
                      {
                        unit: 'usdm',
                        quantity: '500000000',
                      },
                    ],
                    SmartContractWallet: {
                      walletVkey: 'wallet_vkey',
                      walletAddress: 'wallet_address',
                    },
                    state: 'RegistrationRequested',
                    description: 'description',
                    name: 'name',
                    privacyPolicy: 'link to privacy policy',
                    terms: 'link to terms',
                    other: 'link to other',
                  },
                },
              }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/registry/',
    description:
      'Deregisters a agent from the specified registry (Please note that while the command is put on-chain, the transaction is not yet finalized by the blockchain, as designed finality is only eventually reached. If you need certainty, please check status via the registry(GET) or if you require custom logic, the transaction directly using the txHash)',
    summary: 'REQUIRES API KEY Authentication (+PAY)',
    tags: ['registry'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      query: unregisterAgentSchemaInput.openapi({
        example: {
          agentIdentifier: 'agentIdentifier',
          network: Network.Preprod,
          smartContractAddress: 'address',
        },
      }),
    },
    responses: {
      200: {
        description: 'Payment source deleted',
        content: {
          'application/json': {
            schema: z
              .object({ status: z.string(), data: unregisterAgentSchemaOutput })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'cuid2',
                    apiUrl: 'api_url',
                    tags: ['tag1', 'tag2'],
                    capabilityName: 'capability_name',
                    capabilityVersion: 'capability_version',
                    requestsPerHour: '100',
                    Pricing: [
                      {
                        unit: 'usdm',
                        quantity: '500000000',
                      },
                    ],
                    SmartContractWallet: {
                      walletVkey: 'wallet_vkey',
                      walletAddress: 'wallet_address',
                    },
                    state: 'RegistrationRequested',
                    description: 'description',
                    name: 'name',
                    privacyPolicy: 'link to privacy policy',
                    terms: 'link to terms',
                    other: 'link to other',
                  },
                },
              }),
          },
        },
      },
    },
  });

  /********************* PAYMENT CONTRACT *****************************/
  registry.registerPath({
    method: 'get',
    path: '/payment-source/',
    description: 'Gets the payment source.',
    summary: 'REQUIRES API KEY Authentication (+READ)',
    tags: ['payment-source'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      query: paymentSourceSchemaInput.openapi({
        example: {
          take: 10,
          cursorId: 'cursor_id',
        },
      }),
    },
    responses: {
      200: {
        description: 'Payment source status',
        content: {
          'application/json': {
            schema: z
              .object({ status: z.string(), data: paymentSourceSchemaOutput })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    paymentSources: [
                      {
                        id: 'cuid_v2_auto_generated',
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        network: Network.Mainnet,
                        paymentType: PaymentType.Web3CardanoV1,
                        smartContractAddress: 'address_of_the_smart_contract',
                        AdminWallets: [
                          { walletAddress: 'wallet_address', order: 0 },
                          { walletAddress: 'wallet_address', order: 1 },
                          { walletAddress: 'wallet_address', order: 2 },
                        ],
                        feeRatePermille: 50,
                        FeeReceiverNetworkWallet: {
                          walletAddress: 'wallet_address',
                        },
                        lastCheckedAt: new Date(1713636260),
                        lastIdentifierChecked: 'identifier',
                        PurchasingWallets: [
                          {
                            collectionAddress: null,
                            note: 'note',
                            walletVkey: 'wallet_vkey',
                            walletAddress: 'wallet_address',
                            id: 'unique_cuid_v2_auto_generated',
                          },
                          {
                            collectionAddress: 'send_refunds_to_this_address',
                            note: 'note',
                            walletVkey: 'wallet_vkey',
                            walletAddress: 'wallet_address',
                            id: 'unique_cuid_v2_auto_generated',
                          },
                        ],
                        SellingWallets: [
                          {
                            collectionAddress:
                              'null_will_use_selling_wallet_as_revenue_address',
                            note: 'note',
                            walletVkey: 'wallet_vkey',
                            walletAddress: 'wallet_address',
                            id: 'unique_cuid_v2_auto_generated',
                          },
                          {
                            collectionAddress: 'send_revenue_to_this_address',
                            note: 'note',
                            walletVkey: 'wallet_vkey',
                            walletAddress: 'wallet_address',
                            id: 'unique_cuid_v2_auto_generated',
                          },
                        ],
                      },
                    ],
                  },
                },
              }),
          },
        },
      },
    },
  });

  /********************* PAYMENT SOURCE *****************************/
  registry.registerPath({
    method: 'get',
    path: '/payment-source-extended/',
    description: 'Gets the payment contracts including the status.',
    summary: 'REQUIRES API KEY Authentication (+ADMIN)',
    tags: ['payment-source'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      query: paymentSourceExtendedSchemaInput.openapi({
        example: {
          take: 10,
          cursorId: 'cursor_id',
        },
      }),
    },
    responses: {
      200: {
        description: 'Payment source status',
        content: {
          'application/json': {
            schema: z
              .object({
                status: z.string(),
                data: paymentSourceExtendedSchemaOutput,
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    paymentSources: [
                      {
                        id: 'cuid_v2_auto_generated',
                        createdAt: new Date(1713636260),
                        updatedAt: new Date(1713636260),
                        network: Network.Mainnet,
                        paymentType: PaymentType.Web3CardanoV1,
                        feeRatePermille: 50,
                        syncInProgress: true,
                        smartContractAddress: 'address_of_the_smart_contract',
                        AdminWallets: [
                          { walletAddress: 'wallet_address', order: 0 },
                          { walletAddress: 'wallet_address', order: 1 },
                          { walletAddress: 'wallet_address', order: 2 },
                        ],
                        FeeReceiverNetworkWallet: {
                          walletAddress: 'wallet_address',
                        },
                        lastCheckedAt: new Date(1713636260),
                        lastIdentifierChecked: 'identifier',
                        PaymentSourceConfig: {
                          rpcProviderApiKey: 'rpc_provider_api_key_blockfrost',
                          rpcProvider: RPCProvider.Blockfrost,
                        },
                        PurchasingWallets: [
                          {
                            collectionAddress: null,
                            note: 'note',
                            walletVkey: 'wallet_vkey',
                            walletAddress: 'wallet_address',
                            id: 'unique_cuid_v2_auto_generated',
                          },
                          {
                            collectionAddress: 'send_refunds_to_this_address',
                            note: 'note',
                            walletVkey: 'wallet_vkey',
                            walletAddress: 'wallet_address',
                            id: 'unique_cuid_v2_auto_generated',
                          },
                        ],
                        SellingWallets: [
                          {
                            collectionAddress:
                              'null_will_use_selling_wallet_as_revenue_address',
                            note: 'note',
                            walletVkey: 'wallet_vkey',
                            walletAddress: 'wallet_address',
                            id: 'unique_cuid_v2_auto_generated',
                          },
                          {
                            collectionAddress: 'send_revenue_to_this_address',
                            note: 'note',
                            walletVkey: 'wallet_vkey',
                            walletAddress: 'wallet_address',
                            id: 'unique_cuid_v2_auto_generated',
                          },
                        ],
                      },
                    ],
                  },
                },
              }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/payment-source/',
    description: 'Creates a payment source.',
    summary: 'REQUIRES API KEY Authentication (+ADMIN)',
    tags: ['payment-source'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: paymentSourceExtendedCreateSchemaInput.openapi({
              example: {
                network: Network.Preprod,
                PaymentSourceConfig: {
                  rpcProviderApiKey: 'rpc_provider_api_key',
                  rpcProvider: RPCProvider.Blockfrost,
                },
                paymentType: PaymentType.Web3CardanoV1,
                AdminWallets: [
                  { walletAddress: 'wallet_address_1' },
                  { walletAddress: 'wallet_address_2' },
                  { walletAddress: 'wallet_address_3' },
                ],
                FeeReceiverNetworkWallet: { walletAddress: 'wallet_address' },
                feeRatePermille: 50,
                PurchasingWallets: [
                  {
                    walletMnemonic: 'wallet mnemonic',
                    note: 'note',
                    collectionAddress: null,
                  },
                ],
                SellingWallets: [
                  {
                    walletMnemonic: 'wallet mnemonic',
                    note: 'note',
                    collectionAddress: 'collection_address',
                  },
                ],
              },
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Payment source created',
        content: {
          'application/json': {
            schema: z
              .object({
                status: z.string(),
                data: paymentSourceExtendedCreateSchemaOutput,
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'cuid_v2_auto_generated',
                    createdAt: new Date(1713636260),
                    updatedAt: new Date(1713636260),
                    network: Network.Mainnet,
                    paymentType: PaymentType.Web3CardanoV1,
                    syncInProgress: true,
                    smartContractAddress: 'address_of_the_smart_contract',
                    AdminWallets: [
                      { walletAddress: 'wallet_address', order: 0 },
                      { walletAddress: 'wallet_address', order: 1 },
                      { walletAddress: 'wallet_address', order: 2 },
                    ],
                    feeRatePermille: 50,
                    FeeReceiverNetworkWallet: {
                      walletAddress: 'wallet_address',
                    },
                    lastCheckedAt: new Date(1713636260),
                    lastIdentifierChecked: 'identifier',
                    PaymentSourceConfig: {
                      rpcProviderApiKey: 'rpc_provider_api_key_blockfrost',
                      rpcProvider: RPCProvider.Blockfrost,
                    },
                    PurchasingWallets: [
                      {
                        collectionAddress: null,
                        note: 'note',
                        walletVkey: 'wallet_vkey',
                        walletAddress: 'wallet_address',
                        id: 'unique_cuid_v2_auto_generated',
                      },
                      {
                        collectionAddress: 'send_refunds_to_this_address',
                        note: 'note',
                        walletVkey: 'wallet_vkey',
                        walletAddress: 'wallet_address',
                        id: 'unique_cuid_v2_auto_generated',
                      },
                    ],
                    SellingWallets: [
                      {
                        collectionAddress:
                          'null_will_use_the_selling_wallet_as_revenue_address',
                        note: 'note',
                        walletVkey: 'wallet_vkey',
                        walletAddress: 'wallet_address',
                        id: 'unique_cuid_v2_auto_generated',
                      },
                      {
                        collectionAddress: 'send_revenue_to_this_address',
                        note: 'note',
                        walletVkey: 'wallet_vkey',
                        walletAddress: 'wallet_address',
                        id: 'unique_cuid_v2_auto_generated',
                      },
                    ],
                  },
                },
              }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/payment-source/',
    description: 'Updates a payment source.',
    summary: 'REQUIRES API KEY Authentication (+ADMIN)',
    tags: ['payment-source'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      body: {
        description: '',
        content: {
          'application/json': {
            schema: paymentSourceExtendedUpdateSchemaInput.openapi({
              example: {
                id: 'unique_cuid_v2',
                lastIdentifierChecked: 'optional_identifier',
                PaymentSourceConfig: {
                  rpcProviderApiKey: 'rpc_provider_api_key',
                  rpcProvider: RPCProvider.Blockfrost,
                },
                AddPurchasingWallets: [
                  {
                    walletMnemonic: 'wallet_mnemonic',
                    note: 'note',
                    collectionAddress: 'refunds_will_be_sent_to_this_address',
                  },
                ],
                AddSellingWallets: [
                  {
                    walletMnemonic: 'wallet_mnemonic',
                    note: 'note',
                    collectionAddress: 'revenue_will_be_sent_to_this_address',
                  },
                ],
                RemovePurchasingWallets: [{ id: 'unique_cuid_v2' }],
                RemoveSellingWallets: [{ id: 'unique_cuid_v2' }],
              },
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Payment contract updated',
        content: {
          'application/json': {
            schema: z
              .object({
                status: z.string(),
                data: paymentSourceExtendedUpdateSchemaOutput,
              })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    id: 'cuid_v2_auto_generated',
                    createdAt: new Date(1713636260),
                    updatedAt: new Date(1713636260),
                    network: Network.Mainnet,
                    paymentType: PaymentType.Web3CardanoV1,
                    syncInProgress: true,
                    smartContractAddress: 'address_of_the_smart_contract',
                    AdminWallets: [
                      { walletAddress: 'wallet_address', order: 0 },
                      { walletAddress: 'wallet_address', order: 1 },
                      { walletAddress: 'wallet_address', order: 2 },
                    ],
                    feeRatePermille: 50,
                    FeeReceiverNetworkWallet: {
                      walletAddress: 'wallet_address',
                    },
                    lastCheckedAt: new Date(1713636260),
                    lastIdentifierChecked: 'identifier',
                    PaymentSourceConfig: {
                      rpcProviderApiKey: 'rpc_provider_api_key_blockfrost',
                      rpcProvider: RPCProvider.Blockfrost,
                    },
                    PurchasingWallets: [
                      {
                        collectionAddress: null,
                        note: 'note',
                        walletVkey: 'wallet_vkey',
                        walletAddress: 'wallet_address',
                        id: 'unique_cuid_v2_auto_generated',
                      },
                      {
                        collectionAddress: 'send_refunds_to_this_address',
                        note: 'note',
                        walletVkey: 'wallet_vkey',
                        walletAddress: 'wallet_address',
                        id: 'unique_cuid_v2_auto_generated',
                      },
                    ],
                    SellingWallets: [
                      {
                        collectionAddress:
                          'null_will_use_selling_wallet_as_revenue_address',
                        note: 'note',
                        walletVkey: 'wallet_vkey',
                        walletAddress: 'wallet_address',
                        id: 'unique_cuid_v2_auto_generated',
                      },
                      {
                        collectionAddress: 'send_revenue_to_this_address',
                        note: 'note',
                        walletVkey: 'wallet_vkey',
                        walletAddress: 'wallet_address',
                        id: 'unique_cuid_v2_auto_generated',
                      },
                    ],
                  },
                },
              }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/payment-source/',
    description:
      'Deletes a payment source. WARNING will also delete all associated wallets and transactions.',
    summary: 'REQUIRES API KEY Authentication (+ADMIN)',
    tags: ['payment-source'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      query: paymentSourceExtendedDeleteSchemaInput.openapi({
        example: { id: 'unique_cuid_v2_auto_generated' },
      }),
    },
    responses: {
      200: {
        description: 'Payment source deleted',
        content: {
          'application/json': {
            schema: z
              .object({
                status: z.string(),
                data: paymentSourceExtendedDeleteSchemaOutput,
              })
              .openapi({
                example: {
                  status: 'success',
                  data: { id: 'unique_cuid_v2_auto_generated' },
                },
              }),
          },
        },
      },
    },
  });
  /********************* UTXOS *****************************/
  registry.registerPath({
    method: 'get',
    path: '/utxos/',
    description: 'Gets UTXOs (internal)',
    summary: 'REQUIRES API KEY Authentication (+READ)',
    tags: ['utxos'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      query: getUTXOSchemaInput.openapi({
        example: {
          network: Network.Preprod,
          address: 'addr1qx2ej34k567890',
          count: 10,
          page: 1,
          order: 'desc',
        },
      }),
    },
    responses: {
      200: {
        description: 'UTXOs',
        content: {
          'application/json': {
            schema: z
              .object({ status: z.string(), data: getUTXOSchemaOutput })
              .openapi({
                example: {
                  status: 'success',
                  data: {
                    utxos: [
                      {
                        txHash: 'tx_hash',
                        address: 'addr1qx2ej34k567890',
                        amount: [{ unit: 'lovelace', quantity: 10000000 }],
                        output_index: 1,
                        block: '1',
                      },
                    ],
                  },
                },
              }),
          },
        },
      },
    },
  });
  /********************* RPC API KEYS *****************************/
  registry.registerPath({
    method: 'get',
    path: '/rpc-api-keys/',
    description:
      'Gets rpc api keys, currently only blockfrost is supported (internal)',
    summary: 'REQUIRES API KEY Authentication (+ADMIN)',
    tags: ['rpc-api-keys'],
    security: [{ [apiKeyAuth.name]: [] }],
    request: {
      query: getRpcProviderKeysSchemaInput.openapi({
        example: {
          cursorId: 'unique_cuid_v2',
          limit: 50,
        },
      }),
    },
    responses: {
      200: {
        description: 'Blockfrost keys',
        content: {
          'application/json': {
            schema: getRpcProviderKeysSchemaOutput.openapi({
              example: {
                rpcProviderKeys: [
                  {
                    network: Network.Preprod,
                    id: 'unique_cuid_v2',
                    rpcProviderApiKey: 'blockfrost_api_key',
                    rpcProvider: RPCProvider.Blockfrost,
                    createdAt: new Date(1713636260),
                    updatedAt: new Date(1713636260),
                  },
                ],
              },
            }),
          },
        },
      },
    },
  });

  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Template API',
      description: 'This is the default API from a template',
    },

    servers: [{ url: './../api/v1/' }],
  });
}
