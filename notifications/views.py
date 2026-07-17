from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import PushDevice


class DeviceView(APIView):
    """Register or deactivate the calling user's Expo push token.

    Token auth + IsAuthenticated come from the REST_FRAMEWORK defaults.
    """

    def post(self, request):
        token = (request.data.get('token') or '').strip()
        if not token.startswith('ExponentPushToken'):
            return Response({'error': 'A valid Expo push token is required'},
                            status=status.HTTP_400_BAD_REQUEST)
        device, _ = PushDevice.objects.update_or_create(
            token=token,
            defaults={'user': request.user, 'is_active': True},
        )
        return Response({'status': 'registered', 'id': device.id})

    def delete(self, request):
        token = (request.data.get('token') or '').strip()
        if not token:
            return Response({'error': 'token is required'},
                            status=status.HTTP_400_BAD_REQUEST)
        PushDevice.objects.filter(token=token, user=request.user).update(is_active=False)
        return Response({'status': 'deactivated'})
