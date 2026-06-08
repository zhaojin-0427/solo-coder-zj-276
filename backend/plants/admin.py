from django.contrib import admin
from .models import PlantSpecies, Location, Plant, CareLog, CarePlan, CarePlanTask


@admin.register(PlantSpecies)
class PlantSpeciesAdmin(admin.ModelAdmin):
    list_display = ('name', 'base_watering_days', 'base_fertilizing_days', 'base_pruning_days', 'sunlight', 'difficulty')
    list_filter = ('sunlight', 'watering_frequency')
    search_fields = ('name', 'scientific_name')


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'room_type', 'sunlight_level')
    list_filter = ('room_type', 'sunlight_level')


@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display = ('name', 'species', 'location', 'purchase_date', 'health_status')
    list_filter = ('health_status', 'species')
    search_fields = ('name', 'species__name')


@admin.register(CareLog)
class CareLogAdmin(admin.ModelAdmin):
    list_display = ('plant', 'care_type', 'date', 'cost')
    list_filter = ('care_type', 'date')
    search_fields = ('plant__name',)


@admin.register(CarePlan)
class CarePlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'scope_type', 'status', 'start_date', 'end_date', 'created_at')
    list_filter = ('scope_type', 'status')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CarePlanTask)
class CarePlanTaskAdmin(admin.ModelAdmin):
    list_display = ('plant', 'care_type', 'scheduled_date', 'status', 'deviation_days')
    list_filter = ('care_type', 'status', 'scheduled_date')
    search_fields = ('plant__name',)
    readonly_fields = ('created_at', 'updated_at')
