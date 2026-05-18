from django.urls import path
from . import views

urlpatterns = [
    path('ingest/', views.ingest_email, name='ingest_email'),
]
