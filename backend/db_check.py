import psycopg2
import sys

def check_db(dbname, port):
    try:
        conn = psycopg2.connect(
            dbname=dbname,
            user='postgres',
            password='password',
            host='127.0.0.1',
            port=port
        )
        print(f"SUCCESS: {dbname} on port {port}")
        conn.close()
        return True
    except psycopg2.OperationalError as e:
        print(f"FAIL {dbname} on port {port}: {e}")
        return False

# Try money_management on port 5434
if check_db('money_management', '5434'):
    sys.exit(0)
    
if check_db('postgres', '5434'):
    print("Server is UP on 5434, but 'money_management' database is missing.")
    sys.exit(0)
    
print("Failed on 5434 as well.")
