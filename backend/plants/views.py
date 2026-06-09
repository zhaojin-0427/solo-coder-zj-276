from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Avg, Sum, Q
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from collections import defaultdict

from .models import PlantSpecies, Location, Plant, CareLog, CarePlan, CarePlanTask
from .serializers import (
    PlantSpeciesSerializer,
    LocationSerializer,
    PlantSerializer,
    PlantDetailSerializer,
    CareLogSerializer,
    CarePlanSerializer,
    CarePlanTaskSerializer,
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

        pending_tasks = CarePlanTask.objects.filter(
            plant=plant,
            care_type='water',
            status='pending',
            scheduled_date__lte=today
        )
        for task in pending_tasks:
            task.status = 'completed'
            task.actual_date = today
            task.deviation_days = (today - task.scheduled_date).days
            task.save()

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

        pending_tasks = CarePlanTask.objects.filter(
            plant=plant,
            care_type='fertilize',
            status='pending',
            scheduled_date__lte=today
        )
        for task in pending_tasks:
            task.status = 'completed'
            task.actual_date = today
            task.deviation_days = (today - task.scheduled_date).days
            task.cost = cost
            task.save()

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

        pending_tasks = CarePlanTask.objects.filter(
            plant=plant,
            care_type='repot',
            status='pending',
            scheduled_date__lte=today
        )
        for task in pending_tasks:
            task.status = 'completed'
            task.actual_date = today
            task.deviation_days = (today - task.scheduled_date).days
            task.cost = cost
            task.save()

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

        pending_tasks = CarePlanTask.objects.filter(
            plant=plant,
            care_type='prune',
            status='pending',
            scheduled_date__lte=today
        )
        for task in pending_tasks:
            task.status = 'completed'
            task.actual_date = today
            task.deviation_days = (today - task.scheduled_date).days
            task.save()

        serializer = self.get_serializer(plant)
        return Response(serializer.data)


class CareLogViewSet(viewsets.ModelViewSet):
    queryset = CareLog.objects.select_related('plant', 'plant__species').all()
    serializer_class = CareLogSerializer
    pagination_class = None

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

    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        total = queryset.count()
        water_count = queryset.filter(care_type='water').count()
        fertilize_count = queryset.filter(care_type='fertilize').count()
        repot_count = queryset.filter(care_type='repot').count()
        prune_count = queryset.filter(care_type='prune').count()
        other_count = queryset.filter(care_type='other').count()
        total_cost = queryset.aggregate(total=Sum('cost'))['total'] or 0

        return Response({
            'total_count': total,
            'water_count': water_count,
            'fertilize_count': fertilize_count,
            'repot_count': repot_count,
            'prune_count': prune_count,
            'other_count': other_count,
            'total_cost': round(float(total_cost), 2),
        })


class CarePlanViewSet(viewsets.ModelViewSet):
    queryset = CarePlan.objects.select_related('plant', 'location').prefetch_related('tasks').all()
    serializer_class = CarePlanSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        scope_type = self.request.query_params.get('scope_type')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if scope_type:
            queryset = queryset.filter(scope_type=scope_type)
        return queryset

    def _get_last_care_date(self, plant, care_type):
        care_dates = {
            'water': plant.last_watered,
            'fertilize': plant.last_fertilized,
            'repot': plant.last_repotted,
            'prune': plant.last_pruned,
        }
        base_date = care_dates.get(care_type) or plant.purchase_date
        recent_log = CareLog.objects.filter(
            plant=plant,
            care_type=care_type
        ).order_by('-date').first()
        if recent_log and recent_log.date > base_date:
            base_date = recent_log.date
        return base_date

    def _has_conflict(self, plant, care_type, target_date, exclude_task_id=None):
        conflict_types = CarePlanTask.CONFLICT_RULES.get(care_type, [])
        if not conflict_types:
            return None
        existing = CarePlanTask.objects.filter(
            plant=plant,
            scheduled_date=target_date,
            care_type__in=conflict_types,
            status__in=['pending', 'overdue']
        )
        if exclude_task_id:
            existing = existing.exclude(id=exclude_task_id)
        return existing.first()

    def _find_available_date(self, plant, care_type, preferred_date, direction='both'):
        check_date = preferred_date
        if direction == 'both':
            for offset in range(0, 30):
                for delta in [offset, -offset] if offset != 0 else [0]:
                    candidate = preferred_date + timedelta(days=delta)
                    if not self._has_conflict(plant, care_type, candidate):
                        return candidate
        elif direction == 'forward':
            for offset in range(0, 30):
                candidate = preferred_date + timedelta(days=offset)
                if not self._has_conflict(plant, care_type, candidate):
                    return candidate
        else:
            for offset in range(0, 30):
                candidate = preferred_date - timedelta(days=offset)
                if not self._has_conflict(plant, care_type, candidate):
                    return candidate
        return preferred_date

    @action(detail=False, methods=['post'])
    def generate(self, request):
        data = request.data
        scope_type = data.get('scope_type', 'single')
        plant_ids = data.get('plant_ids', [])
        location_id = data.get('location_id')
        start_date_str = data.get('start_date') or datetime.now().date().isoformat()
        days = int(data.get('days', 90))
        care_types = data.get('care_types', ['water', 'fertilize', 'repot', 'prune'])
        custom_rules = data.get('custom_rules', {})
        plan_name = data.get('name', f'养护计划 {datetime.now().strftime("%Y-%m-%d")}')
        notes = data.get('notes', '')

        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': '无效的开始日期'}, status=status.HTTP_400_BAD_REQUEST)

        end_date = start_date + timedelta(days=days)

        target_plants = Plant.objects.select_related('species')
        if scope_type == 'single' and plant_ids:
            target_plants = target_plants.filter(id__in=plant_ids)
        elif scope_type == 'room' and location_id:
            target_plants = target_plants.filter(location_id=location_id)

        target_plants = list(target_plants)
        if not target_plants:
            return Response({'error': '没有符合条件的植物'}, status=status.HTTP_400_BAD_REQUEST)

        plan = CarePlan.objects.create(
            name=plan_name,
            scope_type=scope_type,
            plant=target_plants[0] if scope_type == 'single' and len(target_plants) == 1 else None,
            location_id=location_id if scope_type == 'room' else None,
            start_date=start_date,
            end_date=end_date,
            status='active',
            custom_rules=custom_rules,
            notes=notes
        )

        generated_tasks = []
        for plant in target_plants:
            species = plant.species
            for care_type in care_types:
                base_interval = species.get_seasonal_interval(care_type)
                if care_type in custom_rules and 'interval_days' in custom_rules[care_type]:
                    base_interval = int(custom_rules[care_type]['interval_days'])
                base_interval = max(1, base_interval)

                min_interval = int(custom_rules.get(care_type, {}).get('min_interval_days', base_interval // 2))
                min_interval = max(1, min_interval)

                last_date = self._get_last_care_date(plant, care_type)
                current_date = last_date + timedelta(days=base_interval)

                while current_date <= end_date:
                    if current_date >= start_date:
                        scheduled_date = self._find_available_date(plant, care_type, current_date)
                        task = CarePlanTask(
                            plan=plan,
                            plant=plant,
                            care_type=care_type,
                            scheduled_date=scheduled_date,
                            original_date=current_date,
                            status='pending',
                            is_auto_generated=True
                        )
                        generated_tasks.append(task)
                    current_date += timedelta(days=base_interval)
                    if current_date < start_date:
                        current_date = start_date

        CarePlanTask.objects.bulk_create(generated_tasks, batch_size=100)

        serializer = CarePlanSerializer(plan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        plan = self.get_object()
        plan.status = 'cancelled'
        plan.save()
        plan.tasks.filter(status__in=['pending', 'overdue']).update(status='skipped')
        serializer = self.get_serializer(plan)
        return Response(serializer.data)


class CarePlanTaskViewSet(viewsets.ModelViewSet):
    queryset = CarePlanTask.objects.select_related('plant', 'plant__species', 'plan').all()
    serializer_class = CarePlanTaskSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        plant_id = self.request.query_params.get('plant')
        plan_id = self.request.query_params.get('plan')
        status_filter = self.request.query_params.get('status')
        care_type = self.request.query_params.get('type')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if plant_id:
            queryset = queryset.filter(plant_id=plant_id)
        if plan_id:
            queryset = queryset.filter(plan_id=plan_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if care_type:
            queryset = queryset.filter(care_type=care_type)
        if start_date:
            queryset = queryset.filter(scheduled_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(scheduled_date__lte=end_date)

        return queryset

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        today = datetime.now().date()
        task.status = 'completed'
        task.actual_date = today
        task.deviation_days = (today - task.scheduled_date).days
        task.cost = request.data.get('cost', 0)
        task.notes = request.data.get('notes', '')
        task.save()

        care_dates = {
            'water': 'last_watered',
            'fertilize': 'last_fertilized',
            'repot': 'last_repotted',
            'prune': 'last_pruned',
        }
        field_name = care_dates.get(task.care_type)
        if field_name:
            setattr(task.plant, field_name, today)
            task.plant.save()

        CareLog.objects.create(
            plant=task.plant,
            care_type=task.care_type,
            date=today,
            cost=task.cost,
            notes=task.notes or f'完成计划任务：{task.get_care_type_display()}'
        )

        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def skip(self, request, pk=None):
        task = self.get_object()
        task.status = 'skipped'
        task.notes = request.data.get('notes', task.notes) or '用户手动跳过'
        task.save()
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        task = self.get_object()
        new_date_str = request.data.get('scheduled_date')
        if not new_date_str:
            return Response({'error': '请提供新的计划日期'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            new_date = datetime.strptime(new_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': '无效的日期格式'}, status=status.HTTP_400_BAD_REQUEST)

        conflict = CarePlanTask.CONFLICT_RULES.get(task.care_type, [])
        if conflict:
            existing = CarePlanTask.objects.filter(
                plant=task.plant,
                scheduled_date=new_date,
                care_type__in=conflict,
                status__in=['pending', 'overdue']
            ).exclude(id=task.id).first()
            if existing:
                return Response({
                    'error': f'日期冲突：{new_date} 已安排 {existing.get_care_type_display()}'
                }, status=status.HTTP_400_BAD_REQUEST)

        task.scheduled_date = new_date
        if new_date != task.original_date:
            task.status = 'rescheduled'
        elif task.status == 'skipped':
            task.status = 'skipped'
        else:
            task.status = 'pending'
        task.save()

        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def batch_complete(self, request):
        task_ids = request.data.get('task_ids', [])
        if not task_ids:
            return Response({'error': '请选择要完成的任务'}, status=status.HTTP_400_BAD_REQUEST)

        today = datetime.now().date()
        care_dates = {
            'water': 'last_watered',
            'fertilize': 'last_fertilized',
            'repot': 'last_repotted',
            'prune': 'last_pruned',
        }

        tasks = CarePlanTask.objects.filter(id__in=task_ids, status__in=['pending', 'overdue'])
        updated_plants = {}
        logs_to_create = []

        for task in tasks:
            task.status = 'completed'
            task.actual_date = today
            task.deviation_days = (today - task.scheduled_date).days
            field_name = care_dates.get(task.care_type)
            if field_name and task.plant_id not in updated_plants or True:
                updated_plants.setdefault(task.plant_id, {})
                current = updated_plants[task.plant_id].get(field_name)
                if not current or today > current:
                    updated_plants[task.plant_id][field_name] = today
            logs_to_create.append(CareLog(
                plant=task.plant,
                care_type=task.care_type,
                date=today,
                notes=f'批量完成计划任务'
            ))

        CarePlanTask.objects.bulk_update(tasks, ['status', 'actual_date', 'deviation_days'], batch_size=100)
        CareLog.objects.bulk_create(logs_to_create, batch_size=100)

        for plant_id, fields in updated_plants.items():
            Plant.objects.filter(id=plant_id).update(**fields)

        return Response({'completed': len(tasks)})

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        today = datetime.now().date()
        days_ahead = int(request.query_params.get('days', 7))
        end_date = today + timedelta(days=days_ahead)

        tasks = CarePlanTask.objects.filter(
            status__in=['pending', 'overdue'],
            scheduled_date__lte=end_date
        ).select_related('plant', 'plant__species').order_by('scheduled_date')

        data = defaultdict(list)
        for task in tasks:
            date_str = task.scheduled_date.isoformat()
            task_data = CarePlanTaskSerializer(task).data
            if task.scheduled_date < today:
                task_data['is_overdue'] = True
            data[date_str].append(task_data)

        return Response(dict(data))

    @action(detail=False, methods=['get'])
    def risk_warnings(self, request):
        today = datetime.now().date()
        end_date = today + timedelta(days=7)

        tasks = CarePlanTask.objects.filter(
            status__in=['pending', 'overdue'],
            scheduled_date__lte=end_date
        ).select_related('plant', 'plant__species', 'plant__location')

        warnings = []
        for task in tasks:
            days_left = task.days_until_due
            severity = 'low'
            if task.scheduled_date < today:
                severity = 'high'
            elif days_left <= 1:
                severity = 'high'
            elif days_left <= 3:
                severity = 'medium'

            type_labels = {'water': '浇水', 'fertilize': '施肥', 'repot': '换盆', 'prune': '修剪'}
            warnings.append({
                'task_id': task.id,
                'plant_id': task.plant.id,
                'plant_name': task.plant.name,
                'species_name': task.plant.species.name,
                'location': str(task.plant.location),
                'care_type': task.care_type,
                'care_type_label': type_labels.get(task.care_type, task.care_type),
                'scheduled_date': task.scheduled_date.isoformat(),
                'days_until_due': days_left,
                'is_overdue': task.scheduled_date < today,
                'severity': severity
            })

        warnings.sort(key=lambda x: (x['is_overdue'] and 0 or 1, x['days_until_due']))
        return Response(warnings)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = datetime.now().date()
        total = CarePlanTask.objects.count()
        completed = CarePlanTask.objects.filter(status='completed').count()
        skipped = CarePlanTask.objects.filter(status='skipped').count()
        pending = CarePlanTask.objects.filter(status='pending').count()
        overdue = CarePlanTask.objects.filter(status='pending', scheduled_date__lt=today).count()

        deviated = CarePlanTask.objects.filter(status='completed', deviation_days__gt=1).count()
        deviation_rate = round((deviated / completed) * 100, 1) if completed > 0 else 0
        avg_deviation = 0
        if completed > 0:
            avg_dev = CarePlanTask.objects.filter(status='completed').aggregate(avg=Avg('deviation_days'))['avg']
            avg_deviation = round(float(avg_dev or 0), 1)

        next_7_days = today + timedelta(days=7)
        upcoming = CarePlanTask.objects.filter(
            status__in=['pending', 'overdue'],
            scheduled_date__lte=next_7_days
        ).count()

        return Response({
            'total': total,
            'completed': completed,
            'skipped': skipped,
            'pending': pending,
            'overdue': overdue,
            'completion_rate': round((completed / total) * 100, 1) if total > 0 else 0,
            'deviation_rate': deviation_rate,
            'avg_deviation_days': avg_deviation,
            'upcoming_7days': upcoming
        })


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
                            'type': 'water',
                            'source': 'calculated',
                            'plant_id': plant.id,
                            'plant_name': plant.name,
                            'species_name': plant.species.name,
                            'is_overdue': current < datetime.now().date() and days_since > interval
                        })
                current += timedelta(days=1)

        plan_tasks = CarePlanTask.objects.filter(
            scheduled_date__gte=first_day,
            scheduled_date__lte=last_day
        ).select_related('plant', 'plant__species')

        type_labels = {'water': '💧', 'fertilize': '🌱', 'repot': '🪴', 'prune': '✂️'}
        status_labels = {
            'pending': '待执行',
            'completed': '已完成',
            'skipped': '已跳过',
            'overdue': '已逾期',
            'rescheduled': '已改期'
        }

        for task in plan_tasks:
            date_str = str(task.scheduled_date)
            is_overdue = task.scheduled_date < datetime.now().date() and task.status in ['pending', 'overdue']
            calendar_data[date_str].append({
                'type': task.care_type,
                'source': 'plan',
                'task_id': task.id,
                'plant_id': task.plant.id,
                'plant_name': task.plant.name,
                'species_name': task.plant.species.name,
                'icon': type_labels.get(task.care_type, ''),
                'status': task.status,
                'status_label': status_labels.get(task.status, task.status),
                'is_overdue': is_overdue
            })

        return Response({
            'year': year,
            'month': month,
            'calendar': dict(calendar_data)
        })


class WarningsView(APIView):
    def get(self, request):
        plants = Plant.objects.select_related('species', 'location').all()
        warnings = []
        today = datetime.now().date()

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

            overdue_tasks = CarePlanTask.objects.filter(
                plant=plant,
                status__in=['pending', 'overdue'],
                scheduled_date__lt=today
            )
            if overdue_tasks.exists():
                warning_types.append({
                    'type': 'plan',
                    'message': f'{overdue_tasks.count()} 项养护任务已逾期',
                    'severity': 'high' if overdue_tasks.count() > 2 else 'medium'
                })

            upcoming_tasks = CarePlanTask.objects.filter(
                plant=plant,
                status='pending',
                scheduled_date__gte=today,
                scheduled_date__lte=today + timedelta(days=3)
            )
            if upcoming_tasks.exists():
                warning_types.append({
                    'type': 'plan_upcoming',
                    'message': f'{upcoming_tasks.count()} 项养护任务即将到期',
                    'severity': 'medium'
                })

            if warning_types:
                warnings.append({
                    'plant_id': plant.id,
                    'plant_name': plant.name,
                    'species_name': plant.species.name,
                    'location': str(plant.location),
                    'warnings': warning_types
                })

        warnings.sort(key=lambda x: max((w['severity'] == 'high' and 2 or w['severity'] == 'medium' and 1 or 0) for w in x['warnings']), reverse=True)

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

        total_tasks = CarePlanTask.objects.count()
        completed_tasks = CarePlanTask.objects.filter(status='completed').count()
        plan_completion_rate = round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0

        deviated_tasks = CarePlanTask.objects.filter(status='completed', deviation_days__gt=1).count()
        execution_deviation_rate = round((deviated_tasks / completed_tasks) * 100, 1) if completed_tasks > 0 else 0

        today = datetime.now().date()
        next_7d_warnings = CarePlanTask.objects.filter(
            status__in=['pending', 'overdue'],
            scheduled_date__lte=today + timedelta(days=7)
        ).count()

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
                'total_plans': CarePlan.objects.filter(status='active').count(),
                'plan_completion_rate': plan_completion_rate,
                'execution_deviation_rate': execution_deviation_rate,
                'upcoming_risk_count': next_7d_warnings,
            },
            'room_health': room_health_data,
            'watering_delay_rate': watering_delay_rate,
            'repot_distribution': repot_distribution,
            'cost_trend': cost_trend,
            'health_distribution': {
                s: plants.filter(health_status=s).count()
                for s, _ in Plant.HEALTH_STATUS
            },
            'plan_stats': {
                'total': total_tasks,
                'completed': completed_tasks,
                'skipped': CarePlanTask.objects.filter(status='skipped').count(),
                'pending': CarePlanTask.objects.filter(status='pending').count(),
                'overdue': CarePlanTask.objects.filter(status='pending', scheduled_date__lt=today).count(),
                'completion_rate': plan_completion_rate,
                'deviation_rate': execution_deviation_rate,
                'avg_deviation_days': round(float(
                    CarePlanTask.objects.filter(status='completed').aggregate(
                        avg=Avg('deviation_days')
                    )['avg'] or 0
                ), 1),
            }
        })
