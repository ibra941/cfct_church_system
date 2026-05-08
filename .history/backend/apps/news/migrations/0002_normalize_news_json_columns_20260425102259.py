from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("news", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE news_articles
                ALTER COLUMN images TYPE jsonb
                USING to_jsonb(images),
                ALTER COLUMN tags TYPE jsonb
                USING to_jsonb(tags);

                ALTER TABLE news_articles
                ALTER COLUMN images SET DEFAULT '[]'::jsonb,
                ALTER COLUMN tags SET DEFAULT '[]'::jsonb;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
