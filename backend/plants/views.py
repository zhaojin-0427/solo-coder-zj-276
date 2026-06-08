from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Avg, Sum, Q
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from collections import defaultdict

from .models import PlantSpecies, Location, Plant, CareLog
from .serializers import (
    PlantSpeciesSerializer,
    LocationSerializer,
    PlantSerializer,
    PlantDetailSerializer,
    CareLogSerializer,
)


class PlantSpeciesViewSet(viewsets.ModelViewSet):
    queryset = PlantSpecies.objects.all()
    serializer_class = PlantSpeciesSerializer


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer


class PlantViewSet(viewsets.ModelViewSet):
    queryset = Plant.objects.select_related('species', 'location').all()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PlantDetailSerializer
        return PlantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        health = self.request.query_params.get('health')
        location = self.request.query_params.get('location')
        species = self.request.query_params.get('species')
        overdue = self.request.query_params.get('overdue')

        if health:
            queryset = queryset.filter(health_status=health)
        if location:
            queryset = queryset.filter(location_id=location)
        if species:
            queryset = queryset.filter(species_id=species)
        if overdue == 'true':
            today = datetime.now().date()
            overdue_plants = []
            for plant in queryset:
                if plant.is_overdue_watering:
                    overdue_plants.append(plant.id)
            queryset = queryset.filter(id__in=overdue_plants)

        return queryset

    @action(detail=True, methods=['post'])
    def mark_watered(self, request, pk=None):
        plant = self.get_object()
        today = datetime.now().date()
        plant.last_watered = today
        plant.save()

        CareLog.objects.create(
            plant=plant,
            care_type='water',
            date=today,
            notes='API自动记录浇水'
        )

        serializer = self.get_serializer(plant)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_fertilized(self, request, pk=None):
        plant = self.get_object()
        today = datetime.now().date()
        cost = request.data.get('cost', 0)
        notes = request.data.get('notes', '')

        plant.last_fertilized = today
        plant.save()

        CareLog.objects.create(
            plant=plant,
            care_type='fertilize',
            date=today,
            cost=cost,
            notes=notes
        )

        serializer = self.get_serializer(plant)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_repotted(self, request, pk=None):
        plant = self.get_object()
        today = datetime.now().date()
        cost = request.data.get('cost', 0)
        notes = request.data.get('notes', '')

        plant.last_repotted = today
        plant.save()

        CareLog.objects.create(
            plant=plant,
            care_type='repot',
            date=today,
            cost=cost,
            notes=notes
        )

        serializer = self.get_serializer(plant)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_pruned(self, request, pk=None):
        plant = self.get_object()
        today = datetime.now().date()
        notes = request.data.get('notes', '')

        plant.last_pruned = today
        plant.save()

        CareLog.objects.create(
            plant=plant,
            care_type='prune',
            date=today,
            notes=notes
        )

        serializer = self.get_serializer(plant)
        return Response(serializer.data)


class CareLogViewSet(viewsets.ModelViewSet):
    queryset = CareLog.objects.select_related('plant').all()
    serializer_class = CareLogSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        plant_id = self.request.query_params.get('plant')
        care_type = self.request.query_params.get('type')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if plant_id:
            queryset = queryset.filter(plant_id=plant_id)
        if care_type:
            queryset = queryset.filter(care_type=care_type)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset


class WateringCalendarView(APIView):
    def get(self, request):
        year = request.query_params.get('year', datetime.now().year)
        month = request.query_params.get('month', datetime.now().month)

        try:
            year = int(year)
            month = int(month)
        except (ValueError, TypeError):
            return Response({'error': '无效的日期参数'}, status=status.HTTP_400_BAD_REQUEST)

        first_day = datetime(year, month, 1).date()
        if month == 12:
            last_day = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            last_day = datetime(year, month + 1, 1).date() - timedelta(days=1)

        plants = Plant.objects.select_related('species').all()
        calendar_data = defaultdict(list)

        for plant in plants:
            current = first_day
            while current <= last_day:
                if plant.last_watered:
                    days_since = (current - plant.last_watered).days
                    interval = plant.species.get_seasonal_watering_days()
                    if days_since >= 0 and days_since % interval == 0:
                        calendar_data[str(current)].append({
                            'plant_id': plant.id,
                            'plant_name': plant.name,
                            'species_name': plant.species.name,
                            'is_overdue': current < datetime.now().date() and days_since > interval
                        })
                current += timedelta(days=1)

        return Response({
            'year': year,
            'month': month,
            'calendar': dict(calendar_data)
        })


class WarningsView(APIView):
    def get(self, request):
        plants = Plant.objects.select_related('species', 'location').all()
        warnings = []

        for plant in plants:
            warning_types = []

            if plant.is_overdue_watering:
                warning_types.append({
                    'type': 'watering',
                    'message': f'浇水延迟 {plant.watering_delay_days} 天',
                    'severity': 'high' if plant.watering_delay_days > 7 else 'medium'
                })

            if plant.health_status in ['poor', 'critical']:
                warning_types.append({
                    'type': 'health',
                    'message': f'健康状态: {plant.get_health_status_display()}',
                    'severity': 'high' if plant.health_status == 'critical' else 'medium'
                })

            if warning_types:
                warnings.append({
                    'plant_id': plant.id,
                    'plant_name': plant.name,
                    'species_name': plant.species.name,
                    'location': str(plant.location),
                    'warnings': warning_types
                })

        warnings.sort(key=lambda x: max(w['severity'] == 'high' and 2 or w['severity'] == 'medium' and 1 or 0 for w in x['warnings']), reverse=True)

        return Response(warnings)


class StatisticsView(APIView):
    def get(self, request):
        plants = Plant.objects.select_related('species', 'location').all()
        total_plants = plants.count()

        room_health = defaultdict(lambda: {'total': 0, 'health_sum': 0, 'plants': []})
        health_scores = {'excellent': 5, 'good': 4, 'fair': 3, 'poor': 2, 'critical': 1}

        for plant in plants:
            room_type = plant.location.get_room_type_display()
            room_health[room_type]['total'] += 1
            room_health[room_type]['health_sum'] += health_scores.get(plant.health_status, 3)
            room_health[room_type]['plants'].append(plant.name)

        room_health_data = []
        for room, data in room_health.items():
            avg_score = data['health_sum'] / data['total'] if data['total'] > 0 else 0
            room_health_data.append({
                'room': room,
                'count': data['total'],
                'avg_health_score': round(avg_score, 2),
                'avg_health_percent': round((avg_score / 5) * 100, 1)
            })

        overdue_count = sum(1 for p in plants if p.is_overdue_watering)
        total_delay_days = sum(p.watering_delay_days for p in plants if p.is_overdue_watering)
        watering_delay_rate = round((overdue_count / total_plants * 100), 1) if total_plants > 0 else 0

        repot_periods = []
        for plant in plants:
            if plant.last_repotted:
                days_since = (datetime.now().date() - plant.last_repotted).days
            else:
                days_since = (datetime.now().date() - plant.purchase_date).days
            repot_periods.append(days_since)

        repot_distribution = {
            '0-6个月': sum(1 for d in repot_periods if d <= 180),
            '6-12个月': sum(1 for d in repot_periods if 180 < d <= 365),
            '1-2年': sum(1 for d in repot_periods if 365 < d <= 730),
            '2年以上': sum(1 for d in repot_periods if d > 730),
        }

        care_logs = CareLog.objects.all().order_by('date')
        monthly_costs = defaultdict(float)
        for log in care_logs:
            month_key = log.date.strftime('%Y-%m')
            monthly_costs[month_key] += float(log.cost)

        purchase_costs = defaultdict(float)
        for plant in plants:
            month_key = plant.purchase_date.strftime('%Y-%m')
            purchase_costs[month_key] += float(plant.purchase_cost)

        all_months = sorted(set(list(monthly_costs.keys()) + list(purchase_costs.keys())))
        cost_trend = []
        for month in all_months:
            care_cost = monthly_costs.get(month, 0)
            purchase_cost = purchase_costs.get(month, 0)
            cost_trend.append({
                'month': month,
                'care_cost': round(care_cost, 2),
                'purchase_cost': round(purchase_cost, 2),
                'total_cost': round(care_cost + purchase_cost, 2)
            })

        return Response({
            'summary': {
                'total_plants': total_plants,
                'total_species': PlantSpecies.objects.count(),
                'total_locations': Location.objects.count(),
                'overdue_watering_count': overdue_count,
                'watering_delay_rate': watering_delay_rate,
                'total_delay_days': total_delay_days,
                'total_care_cost': round(sum(float(log.cost) for log in care_logs), 2),
                'total_purchase_cost': round(sum(float(p.purchase_cost) for p in plants), 2),
            },
            'room_health': room_health_data,
            'watering_delay_rate': watering_delay_rate,
            'repot_distribution': repot_distribution,
            'cost_trend': cost_trend,
            'health_distribution': {
                status: plants.filter(health_status=status).count()
                for status, _ in Plant.HEALTH_STATUS
            }
        })
