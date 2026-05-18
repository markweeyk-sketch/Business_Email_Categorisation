from rest_framework import serializers
from emails.models import Email, Classification, RoutingLog


class EmailListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='active_category', allow_null=True, default=None)
    confidence = serializers.FloatField(source='active_confidence', allow_null=True, default=None)
    method = serializers.CharField(source='active_method', allow_null=True, default=None)
    requires_review = serializers.BooleanField(source='active_requires_review', allow_null=True, default=None)
    routed_to = serializers.CharField(source='latest_routed_to', allow_null=True, default=None)
    routing_status = serializers.CharField(source='latest_routing_status', allow_null=True, default=None)

    class Meta:
        model = Email
        fields = [
            'id', 'sender', 'subject', 'received_at',
            'category', 'confidence', 'method', 'requires_review',
            'routed_to', 'routing_status',
        ]


class ClassificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classification
        fields = ['category', 'confidence', 'method', 'reason', 'requires_review', 'created_at']


class RoutingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutingLog
        fields = ['routed_to', 'status', 'routed_at']


class EmailDetailSerializer(serializers.ModelSerializer):
    classification = serializers.SerializerMethodField()
    routing = serializers.SerializerMethodField()

    class Meta:
        model = Email
        fields = ['id', 'message_id', 'sender', 'subject', 'received_at', 'created_at',
                  'classification', 'routing']

    def get_classification(self, obj):
        c = obj.classifications.filter(is_active=True).first()
        return ClassificationSerializer(c).data if c else None

    def get_routing(self, obj):
        r = obj.routing_logs.order_by('-routed_at').first()
        return RoutingLogSerializer(r).data if r else None
