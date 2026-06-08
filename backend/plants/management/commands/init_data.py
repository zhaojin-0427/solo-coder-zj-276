from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import datetime, timedelta
from random import randint, choice, uniform

from plants.models import PlantSpecies, Location, Plant, CareLog


class Command(BaseCommand):
    help = '初始化示例数据'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('开始初始化示例数据...')

        species_data = [
            {
                'name': '绿萝', 'scientific_name': 'Epipremnum aureum',
                'description': '常见的室内观叶植物，耐阴易养，可净化空气。',
                'base_watering_days': 7, 'watering_frequency': 'moderate',
                'sunlight': 'shade', 'min_temperature': 10, 'max_temperature': 30,
                'difficulty': 1, 'toxicity': True
            },
            {
                'name': '多肉植物', 'scientific_name': 'Succulent',
                'description': '肉质植物，储水能力强，需少浇水多晒太阳。',
                'base_watering_days': 14, 'watering_frequency': 'infrequent',
                'sunlight': 'full', 'min_temperature': 5, 'max_temperature': 35,
                'difficulty': 2, 'toxicity': False
            },
            {
                'name': '吊兰', 'scientific_name': 'Chlorophytum comosum',
                'description': '适应性强，耐旱耐阴，可悬挂种植。',
                'base_watering_days': 5, 'watering_frequency': 'moderate',
                'sunlight': 'partial', 'min_temperature': 8, 'max_temperature': 32,
                'difficulty': 1, 'toxicity': False
            },
            {
                'name': '虎皮兰', 'scientific_name': 'Sansevieria trifasciata',
                'description': '耐旱耐阴，夜间释放氧气，适合卧室。',
                'base_watering_days': 20, 'watering_frequency': 'rare',
                'sunlight': 'shade', 'min_temperature': 5, 'max_temperature': 35,
                'difficulty': 1, 'toxicity': True
            },
            {
                'name': '发财树', 'scientific_name': 'Pachira aquatica',
                'description': '寓意吉祥，喜温暖湿润环境，忌积水。',
                'base_watering_days': 10, 'watering_frequency': 'infrequent',
                'sunlight': 'partial', 'min_temperature': 12, 'max_temperature': 30,
                'difficulty': 2, 'toxicity': False
            },
            {
                'name': '龟背竹', 'scientific_name': 'Monstera deliciosa',
                'description': '叶片独特有孔洞，喜温暖湿润半阴环境。',
                'base_watering_days': 7, 'watering_frequency': 'moderate',
                'sunlight': 'partial', 'min_temperature': 15, 'max_temperature': 30,
                'difficulty': 3, 'toxicity': True
            },
            {
                'name': '仙人掌', 'scientific_name': 'Cactaceae',
                'description': '沙漠植物，极耐旱，喜充足阳光。',
                'base_watering_days': 21, 'watering_frequency': 'rare',
                'sunlight': 'full', 'min_temperature': 0, 'max_temperature': 40,
                'difficulty': 1, 'toxicity': False
            },
            {
                'name': '薄荷', 'scientific_name': 'Mentha',
                'description': '芳香植物，可食用泡茶，喜湿润环境。',
                'base_watering_days': 3, 'watering_frequency': 'frequent',
                'sunlight': 'partial', 'min_temperature': 5, 'max_temperature': 30,
                'difficulty': 2, 'toxicity': False
            },
            {
                'name': '茉莉花', 'scientific_name': 'Jasminum sambac',
                'description': '花芳香，喜温暖湿润和阳光充足环境。',
                'base_watering_days': 4, 'watering_frequency': 'frequent',
                'sunlight': 'full', 'min_temperature': 10, 'max_temperature': 35,
                'difficulty': 3, 'toxicity': False
            },
            {
                'name': '文竹', 'scientific_name': 'Asparagus setaceus',
                'description': '姿态优雅，喜温暖湿润半阴通风环境。',
                'base_watering_days': 5, 'watering_frequency': 'moderate',
                'sunlight': 'shade', 'min_temperature': 10, 'max_temperature': 30,
                'difficulty': 3, 'toxicity': False
            },
        ]

        created_species = []
        for data in species_data:
            species, _ = PlantSpecies.objects.get_or_create(
                name=data['name'],
                defaults=data
            )
            created_species.append(species)

        location_data = [
            {'name': '阳台东侧', 'room_type': 'balcony', 'sunlight_level': 'full'},
            {'name': '阳台西侧', 'room_type': 'balcony', 'sunlight_level': 'partial'},
            {'name': '客厅窗台', 'room_type': 'living', 'sunlight_level': 'partial'},
            {'name': '客厅角落', 'room_type': 'living', 'sunlight_level': 'shade'},
            {'name': '卧室书桌', 'room_type': 'bedroom', 'sunlight_level': 'shade'},
            {'name': '卧室窗台', 'room_type': 'bedroom', 'sunlight_level': 'partial'},
            {'name': '厨房窗台', 'room_type': 'kitchen', 'sunlight_level': 'partial'},
            {'name': '书房书架', 'room_type': 'study', 'sunlight_level': 'shade'},
            {'name': '餐厅边柜', 'room_type': 'dining', 'sunlight_level': 'partial'},
            {'name': '卫生间洗手台', 'room_type': 'bathroom', 'sunlight_level': 'shade'},
        ]

        created_locations = []
        for data in location_data:
            location, _ = Location.objects.get_or_create(
                name=data['name'],
                defaults=data
            )
            created_locations.append(location)

        plant_names = [
            '小绿', '肉肉', '吊吊', '小虎', '发财', '背背', '仙仙',
            '小薄', '茉茉', '文文', '大壮', '翠翠', '阿萝', '圆圆', '斑点'
        ]
        health_statuses = ['excellent', 'good', 'fair', 'poor', 'critical']
        today = datetime.now().date()

        for i in range(15):
            species = choice(created_species)
            location = choice(created_locations)
            purchase_days_ago = randint(30, 365)
            purchase_date = today - timedelta(days=purchase_days_ago)

            last_watered_days = randint(0, species.base_watering_days + 5)
            last_watered = today - timedelta(days=last_watered_days)

            health_weights = [0.2, 0.4, 0.25, 0.1, 0.05]
            if last_watered_days > species.base_watering_days * 1.5:
                health_weights = [0.05, 0.15, 0.3, 0.35, 0.15]

            r = uniform(0, 1)
            cumulative = 0
            selected_idx = 0
            for idx, w in enumerate(health_weights):
                cumulative += w
                if r <= cumulative:
                    selected_idx = idx
                    break
            health_status = health_statuses[selected_idx]

            plant = Plant.objects.create(
                name=plant_names[i % len(plant_names)] + (str(i) if i >= len(plant_names) else ''),
                species=species,
                location=location,
                purchase_date=purchase_date,
                last_watered=last_watered,
                last_fertilized=today - timedelta(days=randint(30, 120)) if randint(0, 1) else None,
                last_repotted=purchase_date + timedelta(days=randint(7, 30)) if randint(0, 1) else None,
                last_pruned=today - timedelta(days=randint(60, 180)) if randint(0, 1) else None,
                health_status=health_status,
                purchase_cost=round(uniform(20, 200), 2),
                notes=f'{species.name}的养护笔记'
            )

            care_types = ['water', 'fertilize', 'repot', 'prune', 'other']
            for j in range(randint(3, 10)):
                days_ago = randint(1, purchase_days_ago)
                care_date = today - timedelta(days=days_ago)
                care_type = choice(care_types)

                CareLog.objects.create(
                    plant=plant,
                    care_type=care_type,
                    date=care_date,
                    cost=round(uniform(0, 50), 2) if care_type in ['fertilize', 'repot', 'other'] else 0,
                    notes=f'执行{dict(CareLog.CARE_TYPE_CHOICES).get(care_type, care_type)}操作'
                )

        self.stdout.write(self.style.SUCCESS(f'成功初始化数据:'))
        self.stdout.write(f'  - {PlantSpecies.objects.count()} 个植物品种')
        self.stdout.write(f'  - {Location.objects.count()} 个摆放位置')
        self.stdout.write(f'  - {Plant.objects.count()} 株植物')
        self.stdout.write(f'  - {CareLog.objects.count()} 条养护记录')
