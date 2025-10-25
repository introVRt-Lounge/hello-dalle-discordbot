import { cooldownService } from '../services/cooldownService';

describe('CooldownService', () => {
    beforeEach(() => {
        // Reset the service state before each test
        // Since it's a singleton, we need to access the private map and clear it
        (cooldownService as any).userCooldowns.clear();
    });

    describe('Concurrent Request Prevention', () => {
        it('should allow first request', () => {
            const result = cooldownService.canMakePfpRequest('user1');
            expect(result.canProceed).toBe(true);
        });

        it('should block concurrent requests', () => {
            const requestId = 'req1';
            cooldownService.startPfpRequest('user1', requestId);

            const result = cooldownService.canMakePfpRequest('user1');
            expect(result.canProceed).toBe(false);
            expect(result.message).toContain('already have a pfp generation in progress');
        });

        it('should allow new request after completing previous one', () => {
            const requestId = 'req1';
            cooldownService.startPfpRequest('user1', requestId);
            cooldownService.completePfpRequest('user1', requestId);

            const result = cooldownService.canMakePfpRequest('user1');
            expect(result.canProceed).toBe(true);
        });
    });

    describe('Rate Limiting (3 requests then 60s cooldown)', () => {
        it('should allow first 3 requests without cooldown', () => {
            // First request
            cooldownService.startPfpRequest('user1', 'req1');
            cooldownService.completePfpRequest('user1', 'req1');

            // Second request
            cooldownService.startPfpRequest('user1', 'req2');
            cooldownService.completePfpRequest('user1', 'req2');

            // Third request should still be allowed
            const result = cooldownService.canMakePfpRequest('user1');
            expect(result.canProceed).toBe(true);

            cooldownService.startPfpRequest('user1', 'req3');
            cooldownService.completePfpRequest('user1', 'req3');
        });

        it('should enforce cooldown after 3 requests within 60 seconds', () => {
            // Make 3 requests quickly
            cooldownService.startPfpRequest('user1', 'req1');
            cooldownService.completePfpRequest('user1', 'req1');

            cooldownService.startPfpRequest('user1', 'req2');
            cooldownService.completePfpRequest('user1', 'req2');

            cooldownService.startPfpRequest('user1', 'req3');
            cooldownService.completePfpRequest('user1', 'req3');

            // Fourth request should be blocked
            const result = cooldownService.canMakePfpRequest('user1');
            expect(result.canProceed).toBe(false);
            expect(result.message).toContain('Hold on, cool it a little, wait a bit');
            expect(result.message).toContain('60 seconds'); // Should show remaining time
        });

        it('should allow request after cooldown period', () => {
            // Make 3 requests quickly
            cooldownService.startPfpRequest('user1', 'req1');
            cooldownService.completePfpRequest('user1', 'req1');

            cooldownService.startPfpRequest('user1', 'req2');
            cooldownService.completePfpRequest('user1', 'req2');

            cooldownService.startPfpRequest('user1', 'req3');
            cooldownService.completePfpRequest('user1', 'req3');

            // Simulate waiting 61 seconds (mock Date.now)
            const originalNow = Date.now;
            const mockNow = jest.fn(() => originalNow() + 61000); // 61 seconds later
            global.Date.now = mockNow;

            try {
                const result = cooldownService.canMakePfpRequest('user1');
                expect(result.canProceed).toBe(true);
            } finally {
                global.Date.now = originalNow;
            }
        });
    });

    describe('User Status Tracking', () => {
        it('should track user status correctly', () => {
            const status1 = cooldownService.getUserStatus('user1');
            expect(status1.activeRequests).toBe(0);
            expect(status1.recentRequests).toBe(0);

            cooldownService.startPfpRequest('user1', 'req1');

            const status2 = cooldownService.getUserStatus('user1');
            expect(status2.activeRequests).toBe(1);
            expect(status2.recentRequests).toBe(1);

            cooldownService.completePfpRequest('user1', 'req1');

            const status3 = cooldownService.getUserStatus('user1');
            expect(status3.activeRequests).toBe(0);
            expect(status3.recentRequests).toBe(1);
        });
    });

    describe('Multiple Users', () => {
        it('should handle multiple users independently', () => {
            // User 1 makes a request
            cooldownService.startPfpRequest('user1', 'req1');

            // User 2 should still be allowed
            const result = cooldownService.canMakePfpRequest('user2');
            expect(result.canProceed).toBe(true);

            // User 1 should be blocked
            const result2 = cooldownService.canMakePfpRequest('user1');
            expect(result2.canProceed).toBe(false);
        });
    });
});
