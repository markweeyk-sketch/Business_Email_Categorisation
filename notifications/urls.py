from django.urls import path
from .views import DeviceView

urlpatterns = [
    path('devices/', DeviceView.as_view(), name='push_devices'),
]
