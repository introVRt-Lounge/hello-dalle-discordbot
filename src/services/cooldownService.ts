interface UserCooldownData {
    activeRequests: Set<string>; // Track active request IDs
    recentRequests: number[]; // Timestamps of recent requests (last 3)
}

class CooldownService {
    private userCooldowns = new Map<string, UserCooldownData>();

    private readonly MAX_CONCURRENT_REQUESTS = 1;
    private readonly MAX_REQUESTS_BEFORE_COOLDOWN = 3;
    private readonly COOLDOWN_DURATION_MS = 60 * 1000; // 60 seconds

    /**
     * Check if a user can make a new pfp request
     * @param userId The Discord user ID
     * @returns Object with canProceed boolean and optional error message
     */
    canMakePfpRequest(userId: string): { canProceed: boolean; message?: string } {
        const userData = this.getUserData(userId);

        // Check for concurrent requests
        if (userData.activeRequests.size >= this.MAX_CONCURRENT_REQUESTS) {
            console.log(`Cooldown check: User ${userId} blocked - has ${userData.activeRequests.size} active requests`);
            return {
                canProceed: false,
                message: 'You already have a pfp generation in progress. Please wait until it\'s complete.'
            };
        }

        // Check rate limiting - if they have 3 recent requests and the oldest is still within cooldown period, block
        if (userData.recentRequests.length === this.MAX_REQUESTS_BEFORE_COOLDOWN) {
            const oldestRecentRequest = userData.recentRequests[0];
            const timeSinceOldest = Date.now() - oldestRecentRequest;

            if (timeSinceOldest < this.COOLDOWN_DURATION_MS) {
                const remainingTimeSeconds = Math.ceil((this.COOLDOWN_DURATION_MS - timeSinceOldest) / 1000);
                console.log(`Cooldown check: User ${userId} blocked - cooldown active, ${remainingTimeSeconds}s remaining`);
                return {
                    canProceed: false,
                    message: `Hold on, cool it a little, wait a bit. You can make another request in ${remainingTimeSeconds} seconds.`
                };
            }
        }

        console.log(`Cooldown check: User ${userId} allowed - ${userData.activeRequests.size} active, ${userData.recentRequests.length} recent requests`);
        return { canProceed: true };
    }

    /**
     * Start tracking a new pfp request for a user
     * @param userId The Discord user ID
     * @param requestId Unique identifier for this request
     */
    startPfpRequest(userId: string, requestId: string): void {
        const userData = this.getUserData(userId);

        // Add to active requests
        userData.activeRequests.add(requestId);

        // Add timestamp to recent requests
        userData.recentRequests.push(Date.now());

        // Keep only the last 3 requests for rate limiting
        if (userData.recentRequests.length > this.MAX_REQUESTS_BEFORE_COOLDOWN) {
            userData.recentRequests = userData.recentRequests.slice(-this.MAX_REQUESTS_BEFORE_COOLDOWN);
        }
    }

    /**
     * Mark a pfp request as completed for a user
     * @param userId The Discord user ID
     * @param requestId The request ID to complete
     */
    completePfpRequest(userId: string, requestId: string): void {
        const userData = this.getUserData(userId);
        userData.activeRequests.delete(requestId);
    }

    /**
     * Get or create user cooldown data
     * @param userId The Discord user ID
     * @returns The user's cooldown data
     */
    private getUserData(userId: string): UserCooldownData {
        if (!this.userCooldowns.has(userId)) {
            this.userCooldowns.set(userId, {
                activeRequests: new Set(),
                recentRequests: []
            });
        }
        return this.userCooldowns.get(userId)!;
    }

    /**
     * Get current status for a user (for debugging/logging)
     * @param userId The Discord user ID
     * @returns Object with current status information
     */
    getUserStatus(userId: string): {
        activeRequests: number;
        recentRequests: number;
        cooldownRemaining?: number;
    } {
        const userData = this.getUserData(userId);
        const now = Date.now();

        let cooldownRemaining: number | undefined;
        if (userData.recentRequests.length >= this.MAX_REQUESTS_BEFORE_COOLDOWN) {
            const oldestRecentRequest = userData.recentRequests[0];
            const timeSinceOldest = now - oldestRecentRequest;
            if (timeSinceOldest < this.COOLDOWN_DURATION_MS) {
                cooldownRemaining = Math.ceil((this.COOLDOWN_DURATION_MS - timeSinceOldest) / 1000);
            }
        }

        return {
            activeRequests: userData.activeRequests.size,
            recentRequests: userData.recentRequests.length,
            cooldownRemaining
        };
    }

    /**
     * Clean up old request data (optional maintenance)
     * Removes users who haven't made requests recently
     */
    cleanup(): void {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const [userId, userData] of this.userCooldowns.entries()) {
            // Remove if no active requests and oldest recent request is older than maxAge
            if (userData.activeRequests.size === 0 &&
                (userData.recentRequests.length === 0 ||
                 (userData.recentRequests[0] + maxAge) < now)) {
                this.userCooldowns.delete(userId);
            }
        }
    }
}

// Export singleton instance
export const cooldownService = new CooldownService();
