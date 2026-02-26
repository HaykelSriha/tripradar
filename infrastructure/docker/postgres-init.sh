#!/bin/bash
# Creates all required databases and enables TimescaleDB on the warehouse DB.
# Runs once on first postgres container start (docker-entrypoint-initdb.d).
set -e

echo ">>> Initialising TripRadar databases..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    CREATE DATABASE trigradar;
    CREATE DATABASE trigradar_dw;
    CREATE DATABASE airflow;
    GRANT ALL PRIVILEGES ON DATABASE trigradar TO "$POSTGRES_USER";
    GRANT ALL PRIVILEGES ON DATABASE trigradar_dw TO "$POSTGRES_USER";
    GRANT ALL PRIVILEGES ON DATABASE airflow TO "$POSTGRES_USER";
EOSQL

# Enable TimescaleDB on the data warehouse database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "trigradar_dw" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS timescaledb;
EOSQL

echo ">>> Databases ready."
