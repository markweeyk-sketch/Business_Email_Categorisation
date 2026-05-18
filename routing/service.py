from emails.models import RoutingLog, Classification


ROUTING_MAP = {
    Classification.Category.IT_TECHNICAL: 'IT Technical',
    Classification.Category.MARKETING: 'Marketing',
    Classification.Category.TAX: 'Tax',
    Classification.Category.OTHERS: 'Others',
    Classification.Category.NO_ACTION: 'Archive',
    Classification.Category.UNCLASSIFIED: 'Review Queue',
}


class RoutingService:

    def route(self, email, classification):
        team = ROUTING_MAP.get(classification.category, 'Review Queue')

        try:
            log = RoutingLog.objects.create(
                email=email,
                classification=classification,
                routed_to=team,
                status=RoutingLog.Status.SUCCESS
            )
            return log

        except Exception as e:
            RoutingLog.objects.create(
                email=email,
                classification=classification,
                routed_to=team,
                status=RoutingLog.Status.FAILED,
                error_message=str(e)
            )
            raise