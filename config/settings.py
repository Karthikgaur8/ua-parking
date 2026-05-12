"""
Centralized configuration for UA Parking Platform.

All constants, formulas, and settings in one place.
"""

# Parking Friction Score weights
PFS_WEIGHTS = {
    'difficulty': 0.35,
    'minutes': 0.35,
    'skip': 0.30
}

# Difficulty score mapping
DIFFICULTY_SCORES = {
    "Very Easy": 0.0,
    "Easy": 0.25,
    "Neutral": 0.50,
    "Difficult": 0.75,
    "Very Difficult": 1.0
}

# Minutes normalization max (for PFS calculation)
MINUTES_MAX = 45

# Ranking weights (for weighted priority score)
RANKING_WEIGHTS = {
    1: 3,  # Rank 1 = 3 points
    2: 2,  # Rank 2 = 2 points
    3: 1,  # Rank 3 = 1 point
}

# Challenge labels
CHALLENGE_LABELS = {
    'rank_spots': 'Too few spots',
    'rank_distance': 'Distance from classes',
    'rank_cost': 'High cost',
    'rank_security': 'Security concerns',
    'rank_navigation': 'Poor navigation',
    'rank_other': 'Other'
}

# Text anonymization patterns
ANONYMIZATION = {
    'email_replacement': '[EMAIL]',
    'phone_replacement': '[PHONE]',
    'name_replacement': '[NAME]',
    'quote_max_length': 200
}

# Arrival time ordering (for charts)
ARRIVAL_TIME_ORDER = [
    'Before 8 AM',
    '8-10 AM',
    '10 AM-12 PM',
    '12-2 PM',
    'After 2 PM'
]

# Frequency ordering (for charts)
FREQUENCY_ORDER = [
    'Daily',
    '3-4 times a week',
    '1-2 times a week',
    'Never'
]

# Ease ordering (for charts)
EASE_ORDER = [
    'Very Easy',
    'Easy',
    'Neutral',
    'Difficult',
    'Very Difficult'
]
