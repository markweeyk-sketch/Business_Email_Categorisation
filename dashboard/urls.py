from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.StatsView.as_view(), name='dashboard_stats'),
    path('emails/', views.EmailListView.as_view(), name='dashboard_emails'),
    path('emails/<uuid:pk>/', views.EmailDetailView.as_view(), name='dashboard_email_detail'),
    path('emails/<uuid:pk>/reclassify/', views.ReclassifyView.as_view(), name='dashboard_reclassify'),
    path('response-times/', views.ResponseTimesView.as_view(), name='dashboard_response_times'),
    path('export/', views.EmailExportView.as_view(), name='dashboard_export'),
]
