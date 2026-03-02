import os
import django
from decimal import Decimal
import json
from rest_framework.renderers import JSONRenderer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings') # wait, where is settings? It's config.settings.

data = {
    'val1': Decimal('0.00'),
    'val2': Decimal('200.00') - Decimal('200.00')
}
print(JSONRenderer().render(data))
