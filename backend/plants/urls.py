from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlantSpeciesViewSet,
    LocationViewSet,
    PlantViewSet,
    CareLogViewSet,
    CarePlanViewSet,
    CarePlanTaskViewSet,
    WateringCalendarView,
    WarningsView,
    StatisticsView,
)

router = DefaultRouter()
router.register(r'species', PlantSpeciesViewSet)
router.register(r'locations', LocationViewSet)
router.register(r'plants', PlantViewSet)
router.register(r'care-logs', CareLogViewSet)
router.register(r'care-plans', CarePlanViewSet)
router.register(r'care-plan-tasks', CarePlanTaskViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('watering-calendar/', WateringCalendarView.as_view(), name='watering-calendar'),
    path('warnings/', WarningsView.as_view(), name='warnings'),
    path('statistics/', StatisticsView.as_view(), name='statistics'),
]
