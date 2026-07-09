import os

import psycopg
from dotenv import load_dotenv

load_dotenv()

url = os.environ["DATABASE_URL"]

try:
    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")
            print("Connection OK:", cur.fetchone())
except Exception as e:
    print("Connection FAILED:", e)
