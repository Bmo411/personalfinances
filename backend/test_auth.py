import psycopg2
import os

try:
    print("Trying to connect to DB 'postgres' with user 'postgres' and password 'password' on port 5432 locally...")
    conn = psycopg2.connect(
        dbname='postgres',
        user='postgres',
        password='password',
        host='127.0.0.1',
        port='5432'
    )
    print("SUCCESS! Connected to 'postgres' database.")
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")
