from rest_framework import serializers
from .models import PlantSpecies, Location, Plant, CareLog, CarePlan, CarePlanTask
from datetime import datetime


class PlantSpeciesSerializer(serializers.ModelSerializer):
    seasonal_watering_days = serializers.SerializerMethodField()
    watering_frequency_display = serializers.CharField(source='get_watering_frequency_display', read_only=True)
    sunlight_display = serializers.CharField(source='get_sunlight_display', read_only=True)

    class Meta:
        model = PlantSpecies
        fields = '__all__'

    def get_seasonal_watering_days(self, obj):
        return obj.get_seasonal_watering_days()


class LocationSerializer(serializers.ModelSerializer):
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    sunlight_level_display = serializers.CharField(source='get_sunlight_level_display', read_only=True)

    class Meta:
        model = Location
        fields = '__all__'


class CareLogSerializer(serializers.ModelSerializer):
    care_type_display = serializers.CharField(source='get_care_type_display', read_only=True)
    plant_name = serializers.CharField(source='plant.name', read_only=True)
    plant_species_name = serializers.CharField(source='plant.species.name', read_only=True)

    class Meta:
        model = CareLog
        fields = '__all__'


class PlantSerializer(serializers.ModelSerializer):
    species_detail = PlantSpeciesSerializer(source='species', read_only=True)
    location_detail = LocationSerializer(source='location', read_only=True)
    health_status_display = serializers.CharField(source='get_health_status_display', read_only=True)
    next_watering_date = serializers.DateField(read_only=True)
    days_until_watering = serializers.IntegerField(read_only=True)
    is_overdue_watering = serializers.BooleanField(read_only=True)
    watering_delay_days = serializers.IntegerField(read_only=True)
    days_since_purchase = serializers.IntegerField(read_only=True)
    care_logs_count = serializers.SerializerMethodField()
    upcoming_tasks_count = serializers.SerializerMethodField()
    plan_deviation_rate = serializers.SerializerMethodField()

    class Meta:
        model = Plant
        fields = '__all__'

    def get_care_logs_count(self, obj):
        return obj.care_logs.count()

    def get_upcoming_tasks_count(self, obj):
        today = datetime.now().date()
        return obj.plan_tasks.filter(
            status='pending',
            scheduled_date__gte=today,
            scheduled_date__lte=today + __import__('datetime').timedelta(days=7)
        ).count()

    def get_plan_deviation_rate(self, obj):
        completed_tasks = obj.plan_tasks.filter(status='completed')
        total = completed_tasks.count()
        if total == 0:
            return 0
        deviated = completed_tasks.filter(deviation_days__gt=1).count()
        return round((deviated / total) * 100, 1)


class PlantDetailSerializer(PlantSerializer):
    care_logs = CareLogSerializer(many=True, read_only=True)
    upcoming_plan_tasks = serializers.SerializerMethodField()

    def get_upcoming_plan_tasks(self, obj):
        today = datetime.now().date()
        tasks = obj.plan_tasks.filter(
            status__in=['pending', 'overdue'],
            scheduled_date__lte=today + __import__('datetime').timedelta(days=30)
        ).order_by('scheduled_date')[:10]
        return CarePlanTaskSerializer(tasks, many=True).data


class CarePlanTaskSerializer(serializers.ModelSerializer):
    care_type_display = serializers.CharField(source='get_care_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    plant_name = serializers.CharField(source='plant.name', read_only=True)
    species_name = serializers.CharField(source='plant.species.name', read_only=True)
    days_until_due = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = CarePlanTask
        fields = '__all__'


class CarePlanSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    scope_type_display = serializers.CharField(source='get_scope_type_display', read_only=True)
    plant_name = serializers.CharField(source='plant.name', read_only=True, allow_null=True)
    location_name = serializers.CharField(source='location.name', read_only=True, allow_null=True)
    tasks = CarePlanTaskSerializer(many=True, read_only=True)
    tasks_summary = serializers.SerializerMethodField()

    class Meta:
        model = CarePlan
        fields = '__all__'

    def get_tasks_summary(self, obj):
        total = obj.tasks.count()
        completed = obj.tasks.filter(status='completed').count()
        pending = obj.tasks.filter(status='pending').count()
        skipped = obj.tasks.filter(status='skipped').count()
        overdue = obj.tasks.filter(status='overdue').count()
        return {
            'total': total,
            'completed': completed,
            'pending': pending,
            'skipped': skipped,
            'overdue': overdue,
            'completion_rate': round((completed / total) * 100, 1) if total > 0 else 0
        }
