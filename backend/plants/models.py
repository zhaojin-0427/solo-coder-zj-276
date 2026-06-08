from django.db import models
from datetime import datetime, timedelta


class CarePlan(models.Model):
    PLAN_STATUS_CHOICES = [
        ('draft', '草稿'),
        ('active', '生效中'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
    ]

    SCOPE_TYPE_CHOICES = [
        ('single', '单株植物'),
        ('room', '按房间批量'),
        ('all', '全部植物'),
    ]

    name = models.CharField('计划名称', max_length=200)
    scope_type = models.CharField('计划范围', max_length=20, choices=SCOPE_TYPE_CHOICES, default='single')
    plant = models.ForeignKey('Plant', on_delete=models.CASCADE, null=True, blank=True, related_name='care_plans', verbose_name='目标植物')
    location = models.ForeignKey('Location', on_delete=models.CASCADE, null=True, blank=True, related_name='care_plans', verbose_name='目标房间')
    start_date = models.DateField('计划开始日期')
    end_date = models.DateField('计划结束日期')
    status = models.CharField('计划状态', max_length=20, choices=PLAN_STATUS_CHOICES, default='active')
    custom_rules = models.JSONField('自定义规则', default=dict, blank=True)
    notes = models.TextField('备注', blank=True, null=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '养护计划'
        verbose_name_plural = '养护计划'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_scope_type_display()})"


class CarePlanTask(models.Model):
    TASK_STATUS_CHOICES = [
        ('pending', '待执行'),
        ('completed', '已完成'),
        ('skipped', '已跳过'),
        ('overdue', '已逾期'),
        ('rescheduled', '已改期'),
    ]

    CARE_TYPE_CHOICES = [
        ('water', '浇水'),
        ('fertilize', '施肥'),
        ('repot', '换盆'),
        ('prune', '修剪'),
    ]

    CONFLICT_RULES = {
        'repot': ['fertilize', 'prune'],
        'fertilize': ['repot'],
        'prune': ['repot'],
    }

    plan = models.ForeignKey(CarePlan, on_delete=models.CASCADE, related_name='tasks', verbose_name='所属计划')
    plant = models.ForeignKey('Plant', on_delete=models.CASCADE, related_name='plan_tasks', verbose_name='目标植物')
    care_type = models.CharField('养护类型', max_length=20, choices=CARE_TYPE_CHOICES)
    scheduled_date = models.DateField('计划日期')
    original_date = models.DateField('原始计划日期')
    status = models.CharField('任务状态', max_length=20, choices=TASK_STATUS_CHOICES, default='pending')
    actual_date = models.DateField('实际完成日期', blank=True, null=True)
    cost = models.DecimalField('花费金额', max_digits=10, decimal_places=2, default=0)
    notes = models.TextField('备注', blank=True, null=True)
    deviation_days = models.IntegerField('执行偏差天数', default=0)
    is_auto_generated = models.BooleanField('是否系统自动生成', default=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '养护计划任务'
        verbose_name_plural = '养护计划任务'
        ordering = ['scheduled_date', '-created_at']

    def __str__(self):
        return f"{self.plant.name} - {self.get_care_type_display()} - {self.scheduled_date}"

    @property
    def days_until_due(self):
        today = datetime.now().date()
        return (self.scheduled_date - today).days

    @property
    def is_overdue(self):
        if self.status != 'pending':
            return False
        return self.scheduled_date < datetime.now().date()


class PlantSpecies(models.Model):
    WATERING_FREQUENCY_CHOICES = [
        ('frequent', '频繁（1-3天）'),
        ('moderate', '适中（4-7天）'),
        ('infrequent', '较少（8-14天）'),
        ('rare', '稀少（15-30天）'),
    ]

    SUNLIGHT_CHOICES = [
        ('full', '全日照'),
        ('partial', '半日照'),
        ('shade', '耐阴'),
    ]

    name = models.CharField('品种名称', max_length=100)
    scientific_name = models.CharField('学名', max_length=100, blank=True, null=True)
    description = models.TextField('描述', blank=True, null=True)
    base_watering_days = models.IntegerField('基础浇水间隔（天）', default=7)
    base_fertilizing_days = models.IntegerField('基础施肥间隔（天）', default=30)
    base_repotting_days = models.IntegerField('基础换盆间隔（天）', default=365)
    base_pruning_days = models.IntegerField('基础修剪间隔（天）', default=90)
    watering_frequency = models.CharField(
        '浇水频率', max_length=20, choices=WATERING_FREQUENCY_CHOICES, default='moderate'
    )
    sunlight = models.CharField('光照需求', max_length=20, choices=SUNLIGHT_CHOICES, default='partial')
    min_temperature = models.IntegerField('最低耐受温度(℃)', default=10)
    max_temperature = models.IntegerField('最高耐受温度(℃)', default=35)
    difficulty = models.IntegerField('养护难度(1-5)', default=3)
    toxicity = models.BooleanField('是否有毒', default=False)
    image_url = models.CharField('图片URL', max_length=500, blank=True, null=True)

    class Meta:
        verbose_name = '植物品种'
        verbose_name_plural = '植物品种'
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_seasonal_interval(self, care_type, base_days=None):
        month = datetime.now().month
        base = base_days
        if care_type == 'water':
            base = base_days or self.base_watering_days
        elif care_type == 'fertilize':
            base = base_days or self.base_fertilizing_days
        elif care_type == 'repot':
            base = base_days or self.base_repotting_days
        elif care_type == 'prune':
            base = base_days or self.base_pruning_days

        if base is None:
            base = 30

        if care_type == 'water':
            if month in [6, 7, 8]:
                return max(1, int(base * 0.6))
            elif month in [12, 1, 2]:
                return int(base * 1.8)
            elif month in [3, 4, 5]:
                return int(base * 0.8)
            else:
                return base
        elif care_type == 'fertilize':
            if month in [12, 1, 2]:
                return int(base * 1.5)
            elif month in [3, 4, 5, 9, 10, 11]:
                return int(base * 0.8)
            else:
                return base
        else:
            return base

    def get_seasonal_watering_days(self):
        return self.get_seasonal_interval('water')


class Location(models.Model):
    ROOM_CHOICES = [
        ('living', '客厅'),
        ('bedroom', '卧室'),
        ('kitchen', '厨房'),
        ('bathroom', '卫生间'),
        ('balcony', '阳台'),
        ('study', '书房'),
        ('dining', '餐厅'),
        ('other', '其他'),
    ]

    name = models.CharField('位置名称', max_length=100)
    room_type = models.CharField('房间类型', max_length=20, choices=ROOM_CHOICES, default='living')
    sunlight_level = models.CharField('光照条件', max_length=20, choices=PlantSpecies.SUNLIGHT_CHOICES, default='partial')
    notes = models.TextField('备注', blank=True, null=True)

    class Meta:
        verbose_name = '摆放位置'
        verbose_name_plural = '摆放位置'
        ordering = ['room_type', 'name']

    def __str__(self):
        return f"{self.get_room_type_display()} - {self.name}"


class Plant(models.Model):
    HEALTH_STATUS = [
        ('excellent', '非常健康'),
        ('good', '良好'),
        ('fair', '一般'),
        ('poor', '较差'),
        ('critical', '危急'),
    ]

    name = models.CharField('植物昵称', max_length=100)
    species = models.ForeignKey(PlantSpecies, on_delete=models.CASCADE, verbose_name='品种')
    location = models.ForeignKey(Location, on_delete=models.CASCADE, verbose_name='摆放位置')
    purchase_date = models.DateField('购买日期')
    last_watered = models.DateField('上次浇水日期', blank=True, null=True)
    last_fertilized = models.DateField('上次施肥日期', blank=True, null=True)
    last_repotted = models.DateField('上次换盆日期', blank=True, null=True)
    last_pruned = models.DateField('上次修剪日期', blank=True, null=True)
    health_status = models.CharField('健康状态', max_length=20, choices=HEALTH_STATUS, default='good')
    notes = models.TextField('备注', blank=True, null=True)
    purchase_cost = models.DecimalField('购买成本', max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '植物'
        verbose_name_plural = '植物'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.species.name})"

    @property
    def next_watering_date(self):
        if not self.last_watered:
            return datetime.now().date()
        interval = self.species.get_seasonal_watering_days()
        return self.last_watered + timedelta(days=interval)

    @property
    def days_until_watering(self):
        next_date = self.next_watering_date
        today = datetime.now().date()
        return (next_date - today).days

    @property
    def is_overdue_watering(self):
        return self.days_until_watering < 0

    @property
    def watering_delay_days(self):
        if self.is_overdue_watering:
            return abs(self.days_until_watering)
        return 0

    @property
    def days_since_purchase(self):
        return (datetime.now().date() - self.purchase_date).days


class CareLog(models.Model):
    CARE_TYPE_CHOICES = [
        ('water', '浇水'),
        ('fertilize', '施肥'),
        ('repot', '换盆'),
        ('prune', '修剪'),
        ('other', '其他'),
    ]

    plant = models.ForeignKey(Plant, on_delete=models.CASCADE, related_name='care_logs', verbose_name='植物')
    care_type = models.CharField('养护类型', max_length=20, choices=CARE_TYPE_CHOICES)
    date = models.DateField('日期')
    cost = models.DecimalField('花费金额', max_digits=10, decimal_places=2, default=0)
    notes = models.TextField('备注', blank=True, null=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = '养护记录'
        verbose_name_plural = '养护记录'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.plant.name} - {self.get_care_type_display()} - {self.date}"
