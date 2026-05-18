web: python manage.py collectstatic --noinput && gunicorn config.wsgi:application
release: python manage.py migrate && python manage.py create_admin