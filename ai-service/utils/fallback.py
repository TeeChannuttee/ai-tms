import time

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.last_failure_time = 0
        self.state = 'closed'  # closed, open, half-open
    
    def is_open(self):
        if self.state == 'open':
            # Check if timeout passed
            if time.time() - self.last_failure_time > self.timeout:
                self.state = 'half-open'
                return False
            return True
        return False
    
    def record_success(self):
        if self.state == 'half-open':
            self.state = 'closed'
            self.failure_count = 0
        elif self.state == 'closed':
             self.failure_count = 0
    
    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = 'open'

class FallbackManager:
    def __init__(self):
        self.circuit_breaker = CircuitBreaker()
    
    def execute(self, primary_func, fallback_func, *args, **kwargs):
        """
        Try primary function, fallback if fails or circuit open
        """
        if self.circuit_breaker.is_open():
            return fallback_func(*args, **kwargs)
        
        try:
            result = primary_func(*args, **kwargs)
            self.circuit_breaker.record_success()
            return result
            
        except Exception as e:
            print(f"Primary func failed: {e}")
            self.circuit_breaker.record_failure()
            return fallback_func(*args, **kwargs)
