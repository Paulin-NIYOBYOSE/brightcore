-- Runs once, when the PostgreSQL volume is first initialised.
-- A separate database for the automated tests, which empty its tables.
CREATE DATABASE brightcore_test;
