from django.db import migrations


def normalize_news_json_columns(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        for column in ("images", "tags"):
            cursor.execute(
                """
                SELECT udt_name
                FROM information_schema.columns
                WHERE table_name = 'news_articles' AND column_name = %s
                """,
                [column],
            )
            row = cursor.fetchone()
            if not row:
                continue

            udt_name = row[0]
            if udt_name != "jsonb":
                cursor.execute(
                    f"""
                    ALTER TABLE news_articles
                    ALTER COLUMN {column} TYPE jsonb
                    USING to_jsonb({column})
                    """
                )

            cursor.execute(
                f"""
                ALTER TABLE news_articles
                ALTER COLUMN {column} SET DEFAULT '[]'::jsonb
                """
            )


class Migration(migrations.Migration):

    dependencies = [
        ("news", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(normalize_news_json_columns, migrations.RunPython.noop),
    ]
