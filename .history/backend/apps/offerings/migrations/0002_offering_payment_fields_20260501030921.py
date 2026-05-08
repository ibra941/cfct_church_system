"""
Migration: add payment_status, payment_phone, payment_operator columns to offerings table.
The model is marked managed=False so we use RunPython with raw SQL.
Supports both PostgreSQL (production) and SQLite (tests).
"""

from django.db import migrations


def _pg_add(schema_editor, col, col_type, default):
    schema_editor.execute(
        f"ALTER TABLE offerings ADD COLUMN IF NOT EXISTS {col} {col_type} NOT NULL DEFAULT '{default}'"
    )


def _sqlite_add(schema_editor, col, col_type, default):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("PRAGMA table_info(offerings)")
        existing = {row[1] for row in cursor.fetchall()}
    if col not in existing:
        schema_editor.execute(
            f"ALTER TABLE offerings ADD COLUMN {col} {col_type} NOT NULL DEFAULT '{default}'"
        )


def add_payment_fields(apps, schema_editor):
    vendor = schema_editor.connection.vendor
    cols = [
        ("payment_status", "VARCHAR(20)", "completed"),
        ("payment_phone", "VARCHAR(20)", ""),
        ("payment_operator", "VARCHAR(20)", ""),
    ]
    for col, col_type, default in cols:
        if vendor == "postgresql":
            _pg_add(schema_editor, col, col_type, default)
        else:
            _sqlite_add(schema_editor, col, col_type, default)


def remove_payment_fields(apps, schema_editor):
    vendor = schema_editor.connection.vendor
    cols = ["payment_status", "payment_phone", "payment_operator"]
    for col in cols:
        if vendor == "postgresql":
            schema_editor.execute(f"ALTER TABLE offerings DROP COLUMN IF EXISTS {col}")
        # SQLite does not support DROP COLUMN easily; skip for test environments


class Migration(migrations.Migration):

    dependencies = [
        ("offerings", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_payment_fields, remove_payment_fields),
    ]
