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

    describe('Fast Mode (first 3 requests)', () => {
        it('should allow first 3 requests without any cooldown', () => {
            // First request
            const result1 = cooldownService.canMakePfpRequest('user1');
            expect(result1.canProceed).toBe(true);
            cooldownService.startPfpRequest('user1', 'req1');
            cooldownService.completePfpRequest('user1', 'req1');

            // Second request
            const result2 = cooldownService.canMakePfpRequest('user1');
            expect(result2.canProceed).toBe(true);
            cooldownService.startPfpRequest('user1', 'req2');
            cooldownService.completePfpRequest('user1', 'req2');

            // Third request should still be allowed
            const result3 = cooldownService.canMakePfpRequest('user1');
            expect(result3.canProceed).toBe(true);
            cooldownService.startPfpRequest('user1', 'req3');
            cooldownService.completePfpRequest('user1', 'req3');
        });
    });

    describe('Slow Mode (after 3 requests)', () => {
        beforeEach(() => {
            // Set up user with 3 completed requests
            cooldownService.startPfpRequest('user1', 'req1');
            cooldownService.completePfpRequest('user1', 'req1');
            cooldownService.startPfpRequest('user1', 'req2');
            cooldownService.completePfpRequest('user1', 'req2');
            cooldownService.startPfpRequest('user1', 'req3');
            cooldownService.completePfpRequest('user1', 'req3');
        });

        it('should enforce 90 second cooldown after 3 requests', () => {
            // Fourth request should be blocked (in slow mode)
            const result = cooldownService.canMakePfpRequest('user1');
            expect(result.canProceed).toBe(false);
            expect(result.message).toContain('Hold on, cool it a little, wait a bit');
            expect(result.message).toContain('in a few minutes');
        });

        it('should allow request after 90 seconds in slow mode', () => {
            // Simulate waiting 91 seconds
            const originalNow = Date.now;
            const mockNow = jest.fn(() => originalNow() + 91000); // 91 seconds later
            global.Date.now = mockNow;

            try {
                const result = cooldownService.canMakePfpRequest('user1');
                expect(result.canProceed).toBe(true);
            } finally {
                global.Date.now = originalNow;
            }
        });

        it('should reset to fast mode after 1 hour of inactivity', () => {
            // Simulate waiting 1 hour and 1 second
            const originalNow = Date.now;
            const mockNow = jest.fn(() => originalNow() + (60 * 60 * 1000) + 1000); // 1 hour + 1s later
            global.Date.now = mockNow;

            try {
                const result = cooldownService.canMakePfpRequest('user1');
                expect(result.canProceed).toBe(true);

                // Should be back in fast mode (can make multiple requests quickly)
                cooldownService.startPfpRequest('user1', 'req4');
                cooldownService.completePfpRequest('user1', 'req4');

                const result2 = cooldownService.canMakePfpRequest('user1');
                expect(result2.canProceed).toBe(true); // Still in fast mode (1/3 requests)
            } finally {
                global.Date.now = originalNow;
            }
        });
    });

    describe('User Status Tracking', () => {
        it('should track user status correctly', () => {
            const status1 = cooldownService.getUserStatus('user1');
            expect(status1.activeRequests).toBe(0);
            expect(status1.totalRequests).toBe(0);
            expect(status1.mode).toBe('fast');

            cooldownService.startPfpRequest('user1', 'req1');

            const status2 = cooldownService.getUserStatus('user1');
            expect(status2.activeRequests).toBe(1);
            expect(status2.totalRequests).toBe(1);
            expect(status2.mode).toBe('fast');

            cooldownService.completePfpRequest('user1', 'req1');

            const status3 = cooldownService.getUserStatus('user1');
            expect(status3.activeRequests).toBe(0);
            expect(status3.totalRequests).toBe(1);
            expect(status3.mode).toBe('fast');

            // Make 3 requests to enter slow mode
            cooldownService.startPfpRequest('user1', 'req2');
            cooldownService.completePfpRequest('user1', 'req2');
            cooldownService.startPfpRequest('user1', 'req3');
            cooldownService.completePfpRequest('user1', 'req3');
            cooldownService.startPfpRequest('user1', 'req4');
            cooldownService.completePfpRequest('user1', 'req4');

            const status4 = cooldownService.getUserStatus('user1');
            expect(status4.totalRequests).toBe(4);
            expect(status4.mode).toBe('slow');
            expect(status4.cooldownRemaining).toBeDefined();
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
