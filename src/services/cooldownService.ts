interface UserCooldownData {
    activeRequests: Set<string>; // Track active request IDs
    allRequestTimestamps: number[]; // All timestamps of PFP requests (for session tracking)
}

class CooldownService {
    private userCooldowns = new Map<string, UserCooldownData>();

    private readonly MAX_CONCURRENT_REQUESTS = 1;
    private readonly FAST_MODE_LIMIT = 3; // Allow 3 fast requests
    private readonly FAST_MODE_RESET_HOURS = 1; // Reset to fast mode after 1 hour of inactivity
    private readonly COOLDOWN_DURATION_MS = 90 * 1000; // 90 seconds between requests in slow mode

    /**
     * Check if a user can make a new pfp request
     * @param userId The Discord user ID
     * @returns Object with canProceed boolean and optional error message
     */
    canMakePfpRequest(userId: string): { canProceed: boolean; message?: string } {
        const userData = this.getUserData(userId);
        const now = Date.now();

        // Check for concurrent requests
        if (userData.activeRequests.size >= this.MAX_CONCURRENT_REQUESTS) {
            console.log(`Cooldown check: User ${userId} blocked - has ${userData.activeRequests.size} active requests`);
            return {
                canProceed: false,
                message: 'You already have a pfp generation in progress. Please wait until it\'s complete.'
            };
        }

        // Fast mode: Allow up to 3 requests without restrictions
        if (userData.allRequestTimestamps.length < this.FAST_MODE_LIMIT) {
            console.log(`Cooldown check: User ${userId} allowed - fast mode (${userData.allRequestTimestamps.length}/${this.FAST_MODE_LIMIT} requests)`);
            return { canProceed: true };
        }

        // Check if user should reset to fast mode (1 hour of inactivity)
        const lastRequestTime = Math.max(...userData.allRequestTimestamps);
        const timeSinceLastRequest = now - lastRequestTime;
        const resetThreshold = this.FAST_MODE_RESET_HOURS * 60 * 60 * 1000; // 1 hour in milliseconds

        if (timeSinceLastRequest >= resetThreshold) {
            console.log(`Cooldown check: User ${userId} resetting to fast mode - ${Math.floor(timeSinceLastRequest / (60 * 1000))} minutes since last request`);
            // Reset their request history for fast mode
            userData.allRequestTimestamps = [];
            return { canProceed: true };
        }

        // Slow mode: One request every 90 seconds
        const timeSinceLastRequestSeconds = timeSinceLastRequest / 1000;
        if (timeSinceLastRequestSeconds < 90) {
            const remainingTimeSeconds = Math.ceil(90 - timeSinceLastRequestSeconds);
            console.log(`Cooldown check: User ${userId} blocked - slow mode, ${remainingTimeSeconds}s remaining`);
            return {
                canProceed: false,
                message: 'Hold on, cool it a little, wait a bit. You can make another request in a few minutes.'
            };
        }

        console.log(`Cooldown check: User ${userId} allowed - slow mode, ${Math.floor(timeSinceLastRequestSeconds)}s since last request`);
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

        // Add timestamp to all requests (for session tracking)
        userData.allRequestTimestamps.push(Date.now());
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
                allRequestTimestamps: []
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
        totalRequests: number;
        mode: 'fast' | 'slow';
        cooldownRemaining?: number;
        resetRemaining?: number;
    } {
        const userData = this.getUserData(userId);
        const now = Date.now();

        const isFastMode = userData.allRequestTimestamps.length < this.FAST_MODE_LIMIT;
        let cooldownRemaining: number | undefined;
        let resetRemaining: number | undefined;

        if (!isFastMode && userData.allRequestTimestamps.length > 0) {
            const lastRequestTime = Math.max(...userData.allRequestTimestamps);
            const timeSinceLastRequest = now - lastRequestTime;

            // Check if in cooldown period (90 seconds)
            const cooldownSeconds = timeSinceLastRequest / 1000;
            if (cooldownSeconds < 90) {
                cooldownRemaining = Math.ceil(90 - cooldownSeconds);
            }

            // Time until reset to fast mode (1 hour)
            const resetThreshold = this.FAST_MODE_RESET_HOURS * 60 * 60 * 1000;
            if (timeSinceLastRequest < resetThreshold) {
                resetRemaining = Math.ceil((resetThreshold - timeSinceLastRequest) / (60 * 1000)); // minutes
            }
        }

        return {
            activeRequests: userData.activeRequests.size,
            totalRequests: userData.allRequestTimestamps.length,
            mode: isFastMode ? 'fast' : 'slow',
            cooldownRemaining,
            resetRemaining
        };
    }

    /**
     * Clean up old request data (optional maintenance)
     * Removes users who haven't made requests in over an hour (when they would reset to fast mode anyway)
     */
    cleanup(): void {
        const now = Date.now();
        const resetThreshold = this.FAST_MODE_RESET_HOURS * 60 * 60 * 1000; // 1 hour

        for (const [userId, userData] of this.userCooldowns.entries()) {
            // Remove if no active requests and last request is older than reset threshold
            if (userData.activeRequests.size === 0 &&
                userData.allRequestTimestamps.length > 0) {
                const lastRequestTime = Math.max(...userData.allRequestTimestamps);
                if ((lastRequestTime + resetThreshold) < now) {
                    this.userCooldowns.delete(userId);
                }
            }
        }
    }
}

// Export singleton instance
export const cooldownService = new CooldownService();