
const logger = require('./logger');

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 2;
    this.resetTimeout = options.resetTimeout || 30000; // 30s before trying again
    this.requestTimeout = options.requestTimeout || 5000; // 5s timeout limit

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
  }

  async execute(requestFunction) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        logger.info(`CircuitBreaker[${this.name}]: Entering HALF_OPEN state`, { state: this.state });
        this.state = 'HALF_OPEN';
      } else {
        const remaining = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        logger.warn(`CircuitBreaker[${this.name}]: Call blocked, circuit is OPEN. Retry in ${remaining}s`);
        throw new Error(`CircuitBreaker is OPEN. Retry in ${remaining}s`);
      }
    }

    const startTime = Date.now();
    try {
      const promise = typeof requestFunction === 'function' ? requestFunction() : requestFunction;
      const result = await this.executeWithTimeout(promise);
      return this.success(result);
    } catch (err) {
      const duration = Date.now() - startTime;
      return this.fail(err, duration);
    }
  }

  async executeWithTimeout(promise) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error('Request timed out');
        err.code = 'ETIMEDOUT';
        reject(err);
      }, this.requestTimeout);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  success(result) {
    if (this.state !== 'CLOSED') {
      logger.info(`CircuitBreaker[${this.name}]: Service recovered. State CLOSED.`, { 
        previousState: this.state,
        failures: this.failureCount 
      });
    }
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
    return result;
  }

  fail(err, duration) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    logger.error(`CircuitBreaker[${this.name}]: Failure detected`, {
      error: err.message,
      duration,
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      state: this.state
    });

    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      logger.warn(`CircuitBreaker[${this.name}]: Threshold reached. Circuit OPEN.`, {
        nextAttempt: new Date(this.nextAttempt).toISOString()
      });
    }

    throw err;
  }
}

module.exports = CircuitBreaker;
