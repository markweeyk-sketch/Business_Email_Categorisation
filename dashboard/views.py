import csv
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Count, Subquery, OuterRef
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from emails.models import Email, Classification, RoutingLog
from routing.service import RoutingService
from .serializers import EmailListSerializer, EmailDetailSerializer


def _annotate_emails(qs):
    active_cls = Classification.objects.filter(
        email=OuterRef('pk'), is_active=True
    ).order_by('-created_at')
    latest_routing = RoutingLog.objects.filter(
        email=OuterRef('pk')
    ).order_by('-routed_at')
    return qs.annotate(
        active_category=Subquery(active_cls.values('category')[:1]),
        active_confidence=Subquery(active_cls.values('confidence')[:1]),
        active_method=Subquery(active_cls.values('method')[:1]),
        active_requires_review=Subquery(active_cls.values('requires_review')[:1]),
        latest_routed_to=Subquery(latest_routing.values('routed_to')[:1]),
        latest_routing_status=Subquery(latest_routing.values('status')[:1]),
    )


class EmailPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class StatsView(APIView):
    def get(self, request):
        total = Email.objects.count()

        by_category_qs = (
            Classification.objects
            .filter(is_active=True)
            .values('category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        total_classified = sum(c['count'] for c in by_category_qs)
        by_category = [
            {
                'category': c['category'],
                'count': c['count'],
                'percentage': round(c['count'] / total_classified * 100, 1) if total_classified else 0,
            }
            for c in by_category_qs
        ]

        manually_corrected = Classification.objects.filter(is_active=True, method='manual').count()
        accuracy_rate = (
            round((total_classified - manually_corrected) / total_classified * 100, 1)
            if total_classified else 0
        )
        pending_review = Classification.objects.filter(is_active=True, requires_review=True).count()

        METHOD_LABELS = {'rules': 'Rules engine', 'ai': 'AI (Claude)', 'manual': 'Manual'}
        method_qs = list(
            Classification.objects.filter(is_active=True)
            .values('method')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        total_methods = sum(d['count'] for d in method_qs)
        method_breakdown = [
            {
                'method': d['method'],
                'label': METHOD_LABELS.get(d['method'], d['method']),
                'count': d['count'],
                'percentage': round(d['count'] / total_methods * 100, 1) if total_methods else 0,
            }
            for d in method_qs
        ]
        rules_count = next((d['count'] for d in method_qs if d['method'] == 'rules'), 0)
        rules_rate = round(rules_count / total_methods * 100, 1) if total_methods else 0

        return Response({
            'total_emails': total,
            'by_category': by_category,
            'accuracy_rate': accuracy_rate,
            'pending_review': pending_review,
            'method_breakdown': method_breakdown,
            'rules_rate': rules_rate,
        })


class EmailListView(APIView):
    def get(self, request):
        qs = _annotate_emails(Email.objects.all())

        category = request.query_params.get('category')
        if category:
            qs = qs.filter(active_category=category)

        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(received_at__date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(received_at__date__lte=date_to)

        requires_review = request.query_params.get('requires_review')
        if requires_review:
            qs = qs.filter(active_requires_review=requires_review.lower() == 'true')

        paginator = EmailPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(EmailListSerializer(page, many=True).data)


class EmailDetailView(APIView):
    def get(self, request, pk):
        try:
            email = Email.objects.prefetch_related('classifications', 'routing_logs').get(pk=pk)
        except Email.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(EmailDetailSerializer(email).data)


class ReclassifyView(APIView):
    def patch(self, request, pk):
        try:
            email = Email.objects.get(pk=pk)
        except Email.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        new_category = request.data.get('category')
        if not new_category or new_category not in Classification.Category.values:
            return Response(
                {'error': f'Valid categories: {", ".join(Classification.Category.values)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Classification.objects.filter(email=email, is_active=True).update(is_active=False)

        classification = Classification.objects.create(
            email=email,
            category=new_category,
            confidence=1.0,
            method=Classification.Method.MANUAL,
            reason=f'Manually reclassified to {new_category}',
            requires_review=False,
            corrected_by=request.user if request.user.is_authenticated else None,
            corrected_at=timezone.now(),
            is_active=True,
        )

        routing = RoutingService().route(email, classification)

        return Response({
            'status': 'reclassified',
            'email_id': str(email.id),
            'category': classification.category,
            'routed_to': routing.routed_to,
        })


class ResponseTimesView(APIView):
    def get(self, request):
        by_category = {}
        for log in (RoutingLog.objects
                    .filter(status='success')
                    .select_related('email', 'classification')):
            minutes = (log.routed_at - log.email.received_at).total_seconds() / 60
            cat = log.classification.category
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(minutes)

        return Response([
            {
                'category': cat,
                'avg_minutes': round(sum(times) / len(times), 2),
                'count': len(times),
            }
            for cat, times in by_category.items()
        ])


class EmailExportView(APIView):
    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="emails.csv"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Sender', 'Subject', 'Received At',
                         'Category', 'Confidence', 'Method', 'Routed To', 'Status'])

        qs = _annotate_emails(Email.objects.all())
        category = request.query_params.get('category')
        if category:
            qs = qs.filter(active_category=category)

        for email in qs:
            writer.writerow([
                str(email.id),
                email.sender,
                email.subject,
                email.received_at.isoformat(),
                email.active_category or '',
                f'{email.active_confidence:.2f}' if email.active_confidence else '',
                email.active_method or '',
                email.latest_routed_to or '',
                email.latest_routing_status or '',
            ])

        return response
