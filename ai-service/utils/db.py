import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime

class Database:
    def __init__(self):
        self.host = os.getenv("POSTGRES_HOST", "localhost")
        self.port = os.getenv("POSTGRES_PORT", "5432")
        self.database = os.getenv("POSTGRES_DB", "ai_tms")
        self.user = os.getenv("POSTGRES_USER", "postgres")
        self.password = os.getenv("POSTGRES_PASSWORD", "postgres")
        self.conn = None

    def connect(self):
        if self.conn is None or self.conn.closed:
            try:
                self.conn = psycopg2.connect(
                    host=self.host,
                    port=self.port,
                    database=self.database,
                    user=self.user,
                    password=self.password
                )
            except Exception as e:
                print(f"Database connection failed: {e}")
                pass

    def get_cursor(self):
        self.connect()
        if self.conn:
            return self.conn.cursor(cursor_factory=RealDictCursor)
        return None

    def log_inference(self, model_name, model_version, input_data, output_data, latency_ms, error=None):
        try:
            cur = self.get_cursor()
            if not cur:
                return

            cur.execute("""
                INSERT INTO inference_logs (
                    model_name, model_version, input_data, output_data, 
                    latency_ms, error, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                model_name,
                model_version,
                json.dumps(input_data, default=str),
                json.dumps(output_data, default=str) if output_data else None,
                latency_ms,
                error,
                datetime.now()
            ))
            self.conn.commit()
            cur.close()
        except Exception as e:
            print(f"Failed to log inference: {e}")
            if self.conn:
                self.conn.rollback()

db = Database()
