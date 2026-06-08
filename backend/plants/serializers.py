from rest_framework import serializers
from .models import PlantSpecies, Location, Plant, CareLog
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

    class Meta:
        model = Plant
        fields = '__all__'

    def get_care_logs_count(self, obj):
        return obj.care_logs.count()


class PlantDetailSerializer(PlantSerializer):
    care_logs = CareLogSerializer(many=True, read_only=True)
