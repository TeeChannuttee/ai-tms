import time
import functools
from utils.db import db
import traceback

def log_inference(model_name, model_version):
    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            error = None
            result = None
            
            # Prepare inputs for logging
            log_inputs = kwargs
            
            try:
                result = f(*args, **kwargs)
                return result
            except Exception as e:
                error = str(e)
                raise e
            finally:
                latency_ms = (time.time() - start_time) * 1000
                
                try:
                    output_data = result
                    if hasattr(result, "dict"):
                        output_data = result.dict()
                    elif hasattr(result, "model_dump"):
                         output_data = result.model_dump()
                    
                    db.log_inference(
                        model_name=model_name,
                        model_version=model_version,
                        input_data=log_inputs,
                        output_data=output_data,
                        latency_ms=latency_ms,
                        error=error
                    )
                except Exception as log_err:
                    print(f"Logging failed: {log_err}")
                    
        return wrapper
    return decorator
