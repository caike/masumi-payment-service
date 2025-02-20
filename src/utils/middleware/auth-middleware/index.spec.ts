/* eslint-disable @typescript-eslint/no-require-imports */
import { testMiddleware } from 'express-zod-api';
import { authMiddleware } from './index';
import { ApiKeyStatus, Permission } from '@prisma/client';

jest.mock('@/utils/db', () => ({
    prisma: {
        apiKey: {
            findUnique: jest.fn(),
        },
    },
}));

describe('authMiddleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should throw 401 if no token provided read', async () => {
        await expect(
            testMiddleware({
                middleware: authMiddleware(Permission.Read),
                requestProps: { method: 'POST', body: {}, headers: {} },
                options: {},
            }),
        ).rejects.toThrow('No token provided');
    });
    it('should throw 401 if no token provided pay', async () => {
        await expect(
            testMiddleware({
                middleware: authMiddleware(Permission.ReadAndPay),
                requestProps: { method: 'POST', body: {}, headers: {} },
                options: {},
            }),
        ).rejects.toThrow('No token provided');
    });
    it('should throw 401 if no token provided admin', async () => {
        await expect(
            testMiddleware({
                middleware: authMiddleware(Permission.Admin),
                requestProps: { method: 'POST', body: {}, headers: {} },
                options: {},
            }),
        ).rejects.toThrow('No token provided');
    });
    it('should throw 401 if invalid token read', async () => {
        const { prisma } = require('@/utils/db');
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
            testMiddleware({
                middleware: authMiddleware(Permission.Read),
                requestProps: {
                    method: 'POST',
                    body: {},
                    headers: { token: 'invalid' },
                },
                options: {},
            }),
        ).rejects.toThrow('Invalid token');
    });
    it('should throw 401 if invalid token pay', async () => {
        const { prisma } = require('@/utils/db');
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
            testMiddleware({
                middleware: authMiddleware(Permission.ReadAndPay),
                requestProps: {
                    method: 'POST',
                    body: {},
                    headers: { token: 'invalid' },
                },
                options: {},
            }),
        ).rejects.toThrow('Invalid token');
    });
    it('should throw 401 if invalid token admin', async () => {
        const { prisma } = require('@/utils/db');
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
            testMiddleware({
                middleware: authMiddleware(Permission.Admin),
                requestProps: {
                    method: 'POST',
                    body: {},
                    headers: { token: 'invalid' },
                },
                options: {},
            }),
        ).rejects.toThrow('Invalid token');
    });

    it('should throw 401 if pay required but user is read', async () => {
        const { prisma } = require('@/utils/db');
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
            id: 1,
            permission: Permission.Read,
            status: ApiKeyStatus.Active,
            usageLimited: true,
        });

        await expect(
            testMiddleware({
                middleware: authMiddleware(Permission.ReadAndPay),
                requestProps: { method: 'POST', body: {}, headers: { token: 'valid' } },
                options: {},
            }),
        ).rejects.toThrow('Unauthorized, payment access required');
    });
    it('should throw 401 if admin required but user is not admin', async () => {
        const { prisma } = require('@/utils/db');
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
            id: 1,
            permission: Permission.ReadAndPay,
            status: ApiKeyStatus.Active,
            usageLimited: true,
        });

        await expect(
            testMiddleware({
                middleware: authMiddleware(Permission.Admin),
                requestProps: { method: 'POST', body: {}, headers: { token: 'valid' } },
                options: {},
            }),
        ).rejects.toThrow('Unauthorized, admin access required');
    });

    it('should pass validation with valid user token', async () => {
        const mockApiKey = {
            id: 1,
            permission: Permission.Read,
            status: ApiKeyStatus.Active,
            usageLimited: true,
        };
        const { prisma } = require('@/utils/db');
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(mockApiKey);

        const { output } = await testMiddleware({
            middleware: authMiddleware(Permission.Read),
            requestProps: { method: 'POST', body: {}, headers: { token: 'valid' } },
            options: {},
        });

        expect(output).toEqual({
            id: mockApiKey.id,
            permissions: [mockApiKey.permission],
            usageLimited: mockApiKey.usageLimited,
        });
    });

    it('should pass validation with valid pay token', async () => {
        const mockApiKey = {
            id: 1,
            permission: Permission.ReadAndPay,
            status: ApiKeyStatus.Active,
            usageLimited: true,
        };
        const { prisma } = require('@/utils/db');
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(mockApiKey);

        const { output } = await testMiddleware({
            middleware: authMiddleware(Permission.ReadAndPay),
            requestProps: { method: 'POST', body: {}, headers: { token: 'valid' } },
            options: {},
        });

        expect(output).toEqual({
            id: mockApiKey.id,
            permissions: [mockApiKey.permission],
            usageLimited: mockApiKey.usageLimited,
        });
    });
    it('should pass validation with valid admin token', async () => {
        const mockApiKey = {
            id: 1,
            permission: Permission.Admin,
            status: ApiKeyStatus.Active,
            usageLimited: true,
        };
        const { prisma } = require('@/utils/db');
        (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(mockApiKey);

        const { output } = await testMiddleware({
            middleware: authMiddleware(Permission.Admin),
            requestProps: { method: 'POST', body: {}, headers: { token: 'valid' } },
            options: {},
        });

        expect(output).toEqual({
            id: mockApiKey.id,
            permissions: [mockApiKey.permission],
            usageLimited: mockApiKey.usageLimited,
        });
    });
});
